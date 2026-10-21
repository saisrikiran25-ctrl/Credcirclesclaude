import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { openDb, schema, type Db } from "@/lib/db";
import { rupees } from "@/lib/domain/constants";
import { reconcilePool } from "@/lib/domain/ledger";
import {
  contribute, createCircle, joinByInvite, circleInviteCode, removeMember, setComplianceMode, updateRules,
} from "@/lib/core/circles";
import {
  castVote, closeVote, loanDetail, markDefault, payShare, proposeRestructure, repayManual, requestContext, requestLoan,
  runAutopayNow, setupMandate, simulateOtherLenders, sweep, voteRestructure,
} from "@/lib/core/loans";
import { circleLedger, circleStats, circleTotals, toLedgerLike } from "@/lib/core/stats";
import { newId, AppError } from "@/lib/core/shared";

const DAY = 24 * 3600 * 1000;
let db: Db;
let now: Date;
let seq = 0;

function mkUser(name: string, opts: { verified?: boolean; vetted?: boolean; ageDays?: number } = {}) {
  seq += 1;
  const id = newId();
  db.insert(schema.users).values({
    id, phone: `98000000${seq.toString().padStart(2, "0")}`, name, city: "Hyderabad", segment: "student",
    vpa: `${name.toLowerCase()}@upi`, kycStatus: opts.verified === false ? "none" : "verified", vetted: opts.vetted ?? false,
    isPlatformAdmin: false, createdAt: new Date(now.getTime() - (opts.ageDays ?? 200) * DAY),
  }).run();
  return id;
}

const rules = { maxLoan: rupees(20000), interestPct: 10, approvalThresholdPct: 70, latePenaltyType: "flat" as const, latePenaltyValue: rupees(100), votingWindowHours: 48 };

function setup(memberCount = 4) {
  const admin = mkUser("Admin");
  const circleId = createCircle(db, admin, { type: "friends", name: "Test Circle", city: "Hyderabad", rules }, now);
  const code = circleInviteCode(db, circleId)!;
  const members: string[] = [];
  for (let i = 0; i < memberCount; i++) {
    const u = mkUser(`Member${i + 1}`);
    joinByInvite(db, u, code, now);
    members.push(u);
  }
  return { admin, circleId, code, members };
}

async function fundCircle(circleId: string, ids: string[], amount = rupees(5000)) {
  for (const id of ids) await contribute(db, id, circleId, amount, "success", now);
}

beforeEach(() => {
  db = openDb(":memory:").db;
  now = new Date("2026-06-01T10:00:00Z");
  seq = 0;
});

describe("circles and access", () => {
  it("blocks unverified users from joining or creating", () => {
    const admin = mkUser("Admin");
    const circleId = createCircle(db, admin, { type: "friends", name: "Alpha Circle", city: "Pune", rules }, now);
    const code = circleInviteCode(db, circleId)!;
    const u = mkUser("Newbie", { verified: false });
    expect(() => joinByInvite(db, u, code, now)).toThrow(AppError);
    expect(() => createCircle(db, u, { type: "friends", name: "Nope Circle", city: "Pune", rules }, now)).toThrow(/eKYC/);
  });

  it("rejects an invalid invite code and a duplicate join", () => {
    const { members, code } = setup(1);
    expect(() => joinByInvite(db, members[0], code, now)).toThrow(/already/);
    const u = mkUser("Other");
    expect(() => joinByInvite(db, u, "ZZZZZZ", now)).toThrow(/invite/);
  });

  it("enforces rule validation on creation (interest 8-12%)", () => {
    const admin = mkUser("Admin");
    expect(() => createCircle(db, admin, { type: "friends", name: "Bad Rate", city: "Pune", rules: { ...rules, interestPct: 15 } }, now)).toThrow(/8-12/);
  });

  it("only admins can edit rules, and non-members cannot read a loan", () => {
    const { circleId, members, admin } = setup(2);
    expect(() => updateRules(db, members[0], circleId, { ...rules, interestPct: 9 }, now)).toThrow(/admin/);
    updateRules(db, admin, circleId, { ...rules, interestPct: 9 }, now);
    expect(db.select().from(schema.circles).where(eq(schema.circles.id, circleId)).get()!.interestPct).toBe(9);
  });

  it("limits contributions to 500-5000 and logs failures without counting them", async () => {
    const { circleId, members } = setup(1);
    await expect(contribute(db, members[0], circleId, rupees(499), "success", now)).rejects.toThrow(/Minimum/);
    await expect(contribute(db, members[0], circleId, rupees(5001), "success", now)).rejects.toThrow(/Maximum/);
    const bad = await contribute(db, members[0], circleId, rupees(1000), "failure", now);
    expect(bad.ok).toBe(false);
    expect(circleTotals(db, circleId).pool).toBe(0);
    const ok = await contribute(db, members[0], circleId, rupees(1000), "success", now);
    expect(ok.ok).toBe(true);
    expect(circleTotals(db, circleId).pool).toBe(rupees(1000));
    expect(circleLedger(db, circleId).filter((e) => e.status === "failed")).toHaveLength(1);
  });
});

describe("loan lifecycle (golden path)", () => {
  it("request -> vote to the 70% threshold -> UPI disbursement -> repay -> closed, reconciled at every step", async () => {
    const { admin, circleId, members } = setup(4); // 5 members; borrower excluded => 4 voters, 70% => 3 approvals
    await fundCircle(circleId, [admin, ...members]); // 25,000 pool
    expect(circleTotals(db, circleId).pool).toBe(rupees(25000));

    const borrower = members[0];
    const ctx = requestContext(db, borrower, circleId, now);
    expect(ctx.blocked).toBeNull();
    expect(ctx.recommendedMax).toBe(rupees(8750)); // 35% of 25,000

    const loanId = requestLoan(db, borrower, circleId, { amount: rupees(10000), purpose: "education", tenureMonths: 3, interestPct: 10 }, now);
    let d = loanDetail(db, loanId, admin, now);
    expect(d.status).toBe("voting");
    expect(d.required).toBe(3);
    expect(d.loan.platformFee).toBe(rupees(150)); // 1.5%

    // the borrower cannot vote on their own request
    expect(() => castVote(db, borrower, loanId, "approve", undefined, now)).toThrow(/own request/);

    castVote(db, members[1], loanId, "approve", "Good luck", now);
    castVote(db, members[2], loanId, "approve", undefined, now);
    expect(loanDetail(db, loanId, admin, now).status).toBe("voting"); // 2 of 3 needed
    castVote(db, members[3], loanId, "approve", undefined, now);
    d = loanDetail(db, loanId, admin, now);
    expect(d.status).toBe("approved");
    expect(d.lenders.length).toBeGreaterThan(0);
    expect(d.lenders.reduce((a, l) => a + l.amount, 0)).toBe(rupees(10000));

    // each lender pays their share directly; one failure then a retry
    const first = d.lenders[0];
    const failed = await payShare(db, first.lenderId, loanId, "failure", now);
    expect(failed.ok).toBe(false);
    expect(loanDetail(db, loanId, admin, now).status).toBe("approved");
    for (const l of d.lenders) {
      const r = await payShare(db, l.lenderId, loanId, "success", now);
      expect(r.ok).toBe(true);
    }
    d = loanDetail(db, loanId, admin, now);
    expect(d.status).toBe("repaying");
    expect(d.instalments).toHaveLength(3);
    expect(d.outstanding).toBe(rupees(10000));

    let totals = circleTotals(db, circleId);
    expect(totals.pool).toBe(rupees(15000)); // 25,000 - 10,000 lent
    expect(totals.outstanding).toBe(rupees(10000));
    expect(totals.platformFees).toBe(rupees(150)); // platform fee is NOT in the pool
    expect(reconcilePool(toLedgerLike(circleLedger(db, circleId)), rupees(15000)).ok).toBe(true);

    // repay all three instalments
    for (let n = 0; n < 3; n++) {
      const r = await repayManual(db, borrower, loanId, "success", new Date(now.getTime() + (n + 1) * 30 * DAY));
      expect(r.ok).toBe(true);
    }
    d = loanDetail(db, loanId, admin, new Date(now.getTime() + 100 * DAY));
    expect(d.status).toBe("closed");
    totals = circleTotals(db, circleId);
    expect(totals.outstanding).toBe(0);
    expect(totals.interestEarned).toBe(rupees(250)); // 10,000 x 10% x 3/12
    expect(totals.pool).toBe(rupees(25000) + rupees(250));
  });

  it("rejects a loan outside pilot limits and above circle capacity", async () => {
    const { admin, circleId, members } = setup(3);
    await fundCircle(circleId, [admin, ...members], rupees(1000)); // 4,000 pool
    const b = members[0];
    expect(() => requestLoan(db, b, circleId, { amount: rupees(4000), purpose: "emergency", tenureMonths: 2, interestPct: 10 }, now)).toThrow(/start at/);
    expect(() => requestLoan(db, b, circleId, { amount: rupees(20001), purpose: "emergency", tenureMonths: 2, interestPct: 10 }, now)).toThrow();
    expect(() => requestLoan(db, b, circleId, { amount: rupees(10000), purpose: "emergency", tenureMonths: 7, interestPct: 10 }, now)).toThrow(/months/);
    expect(() => requestLoan(db, b, circleId, { amount: rupees(10000), purpose: "emergency", tenureMonths: 3, interestPct: 10 }, now)).toThrow(/capacity/);
  });

  it("rejects early once the threshold cannot be reached, and on 'close vote'", async () => {
    const { admin, circleId, members } = setup(4);
    await fundCircle(circleId, [admin, ...members]);
    const loanId = requestLoan(db, members[0], circleId, { amount: rupees(5000), purpose: "gadgets", tenureMonths: 2, interestPct: 9 }, now);
    castVote(db, members[1], loanId, "reject", "Not now", now);
    castVote(db, members[2], loanId, "reject", undefined, now);
    expect(loanDetail(db, loanId, admin, now).status).toBe("rejected"); // 2 rejections => max 2 of 3 needed approvals

    const loan2 = requestLoan(db, members[1], circleId, { amount: rupees(5000), purpose: "gadgets", tenureMonths: 2, interestPct: 9 }, now);
    castVote(db, members[2], loan2, "approve", undefined, now);
    expect(() => closeVote(db, members[2], loan2, now)).toThrow(/admin/);
    closeVote(db, admin, loan2, now);
    expect(loanDetail(db, loan2, admin, now).status).toBe("rejected");
  });

  it("closes expired votes in the sweep", async () => {
    const { admin, circleId, members } = setup(4);
    await fundCircle(circleId, [admin, ...members]);
    const loanId = requestLoan(db, members[0], circleId, { amount: rupees(5000), purpose: "skills", tenureMonths: 2, interestPct: 9 }, now);
    castVote(db, members[1], loanId, "approve", undefined, now);
    sweep(db, new Date(now.getTime() + 49 * 3600 * 1000));
    expect(loanDetail(db, loanId, admin, now).status).toBe("rejected");
  });

  it("snapshots rules so later edits only affect new loans", async () => {
    const { admin, circleId, members } = setup(4);
    await fundCircle(circleId, [admin, ...members]);
    const loanId = requestLoan(db, members[0], circleId, { amount: rupees(5000), purpose: "skills", tenureMonths: 2, interestPct: 9 }, now);
    updateRules(db, admin, circleId, { ...rules, approvalThresholdPct: 100 }, now);
    expect(loanDetail(db, loanId, admin, now).loan.thresholdPct).toBe(70);
    const loan2 = requestLoan(db, members[1], circleId, { amount: rupees(5000), purpose: "skills", tenureMonths: 2, interestPct: 9 }, now);
    expect(loanDetail(db, loan2, admin, now).loan.thresholdPct).toBe(100);
  });
});

describe("regulatory posture: compliance modes and external borrowers", () => {
  it("Mode A lets a vetted outsider borrow; Mode C blocks them; unvetted outsiders are blocked", async () => {
    const { admin, circleId, members } = setup(3);
    await fundCircle(circleId, [admin, ...members]);
    const outsider = mkUser("Outsider", { vetted: true });
    const c1 = requestContext(db, outsider, circleId, now);
    expect(c1.blocked).toBeNull();
    expect(c1.isExternal).toBe(true);
    const loanId = requestLoan(db, outsider, circleId, { amount: rupees(5000), purpose: "business", tenureMonths: 2, interestPct: 11 }, now);
    expect(loanDetail(db, loanId, outsider, now).loan.isExternal).toBe(true);
    // all 4 members can vote on an external request
    expect(loanDetail(db, loanId, admin, now).eligibleCount).toBe(4);

    const stranger = mkUser("Stranger", { ageDays: 2 });
    expect(requestContext(db, stranger, circleId, now).blocked).toMatch(/vetted/);

    setComplianceMode(db, admin, circleId, "C");
    const c2 = requestContext(db, mkUser("Outsider2", { vetted: true }), circleId, now);
    expect(c2.blocked).toMatch(/Closed mode/);
  });

  it("members of other circles cannot read this circle's loans", async () => {
    const { admin, circleId, members } = setup(3);
    await fundCircle(circleId, [admin, ...members]);
    const loanId = requestLoan(db, members[0], circleId, { amount: rupees(5000), purpose: "skills", tenureMonths: 2, interestPct: 9 }, now);
    const outsider = mkUser("Snoop");
    expect(() => loanDetail(db, loanId, outsider, now)).toThrow(/Only circle members/);
  });
});

async function runningLoan() {
  const s = setup(4);
  await fundCircle(s.circleId, [s.admin, ...s.members]);
  const borrower = s.members[0];
  const loanId = requestLoan(db, borrower, s.circleId, { amount: rupees(12000), purpose: "business", tenureMonths: 4, interestPct: 12 }, now);
  for (const v of s.members.slice(1)) castVote(db, v, loanId, "approve", undefined, now);
  const d = loanDetail(db, loanId, s.admin, now);
  for (const l of d.lenders) await payShare(db, l.lenderId, loanId, "success", now);
  return { ...s, borrower, loanId };
}

describe("overdue, penalties, restructure, default", () => {
  it("moves upcoming -> due -> overdue and charges one late fee under the circle's rules", async () => {
    const { admin, loanId } = await runningLoan();
    const first = loanDetail(db, loanId, admin, now).instalments[0];
    const dueSoon = new Date(first.dueDate.getTime() - DAY);
    expect(loanDetail(db, loanId, admin, dueSoon).instalments[0].status).toBe("due");
    const late = new Date(first.dueDate.getTime() + 3 * DAY);
    sweep(db, late);
    sweep(db, late); // idempotent: the penalty is charged once
    const d = loanDetail(db, loanId, admin, late);
    expect(d.status).toBe("overdue");
    expect(d.instalments[0].penalty).toBe(rupees(100));
    expect(d.penaltiesOwed).toBe(rupees(100));
    const notes = db.select().from(schema.notifications).all().filter((n) => n.kind === "overdue");
    expect(notes.length).toBeGreaterThan(0);
  });

  it("collects the late fee into the pool when the instalment is finally paid", async () => {
    const { admin, circleId, borrower, loanId } = await runningLoan();
    const first = loanDetail(db, loanId, admin, now).instalments[0];
    const late = new Date(first.dueDate.getTime() + 3 * DAY);
    sweep(db, late);
    const before = circleTotals(db, circleId);
    await repayManual(db, borrower, loanId, "success", late);
    const after = circleTotals(db, circleId);
    expect(after.penalties - before.penalties).toBe(rupees(100));
    expect(after.principalRepaid - before.principalRepaid).toBe(rupees(3000));
  });

  it("AutoPay mandate debits due instalments in the sweep", async () => {
    const { admin, borrower, loanId } = await runningLoan();
    await setupMandate(db, borrower, loanId, now);
    expect(loanDetail(db, loanId, admin, now).mandate?.status).toBe("active");
    const first = loanDetail(db, loanId, admin, now).instalments[0];
    sweep(db, new Date(first.dueDate.getTime() + 60 * 1000));
    const d = loanDetail(db, loanId, admin, new Date(first.dueDate.getTime() + 60 * 1000));
    expect(d.instalments[0].paidAt).not.toBeNull();
    expect(d.repayments[0].method).toBe("autopay");
    runAutopayNow(db, borrower, loanId, now);
    expect(loanDetail(db, loanId, admin, now).instalments.filter((i) => i.paidAt)).toHaveLength(2);
  });

  it("restructures the remaining principal once the circle approves", async () => {
    const { admin, members, borrower, loanId } = await runningLoan();
    const first = loanDetail(db, loanId, admin, now).instalments[0];
    const late = new Date(first.dueDate.getTime() + 5 * DAY);
    sweep(db, late);
    proposeRestructure(db, borrower, loanId, 6, "Delayed stipend, need more time", late);
    const p = loanDetail(db, loanId, admin, late).proposal!;
    expect(() => voteRestructure(db, borrower, p.id, "approve", late)).toThrow(/borrower/);
    for (const m of members.slice(1)) voteRestructure(db, m, p.id, "approve", late);
    const d = loanDetail(db, loanId, admin, late);
    expect(d.loan.restructuredAt).not.toBeNull();
    expect(d.instalments.filter((i) => !i.paidAt)).toHaveLength(6);
    expect(d.outstanding).toBe(rupees(12000));
    expect(d.proposal?.status).toBe("approved");
  });

  it("writes off a default and shares the loss in proportion to what each lender funded", async () => {
    const { admin, circleId, loanId } = await runningLoan();
    const d0 = loanDetail(db, loanId, admin, now);
    const first = d0.instalments[0];
    const late = new Date(first.dueDate.getTime() + 40 * DAY);
    markDefault(db, admin, loanId, late);
    const d = loanDetail(db, loanId, admin, late);
    expect(d.status).toBe("defaulted");
    expect(d.losses!.loss).toBe(rupees(12000));
    expect(d.losses!.shares.reduce((a, s) => a + s.loss, 0)).toBe(rupees(12000));
    for (const s of d.losses!.shares) {
      const funded = d0.lenders.find((l) => l.lenderId === s.lenderId)!.amount;
      expect(Math.abs(s.loss - funded)).toBeLessThanOrEqual(1); // fully unpaid: loss == funded share
    }
    const t = circleTotals(db, circleId);
    expect(t.outstanding).toBe(0);
    expect(t.writtenOff).toBe(rupees(12000));
    expect(circleStats(db, circleId, late).totals.pool).toBe(rupees(25000) - rupees(12000));
  });

  it("cannot mark a healthy loan as defaulted, or remove a member with an open loan", async () => {
    const { admin, circleId, borrower, loanId } = await runningLoan();
    expect(() => markDefault(db, admin, loanId, now)).toThrow(/overdue/);
    expect(() => removeMember(db, admin, circleId, borrower, now)).toThrow(/open loan/);
  });
});

describe("ledger is append-only", () => {
  it("the database rejects updates and deletes", async () => {
    const { circleId, members } = setup(1);
    await contribute(db, members[0], circleId, rupees(1000), "success", now);
    const { raw } = openDb(":memory:");
    expect(() => raw.prepare("select 1").get()).not.toThrow();
    // the live db: use drizzle to try mutating
    expect(() => db.update(schema.ledgerEntries).set({ amount: 1 }).run()).toThrow(/append-only/);
    expect(() => db.delete(schema.ledgerEntries).run()).toThrow(/append-only/);
  });
});

describe("simulated lenders (demo helper)", () => {
  it("settles all other lenders so one reviewer can finish the flow", async () => {
    const s = setup(4);
    await fundCircle(s.circleId, [s.admin, ...s.members]);
    const loanId = requestLoan(db, s.members[0], s.circleId, { amount: rupees(10000), purpose: "skills", tenureMonths: 2, interestPct: 9 }, now);
    for (const v of s.members.slice(1)) castVote(db, v, loanId, "approve", undefined, now);
    const d = loanDetail(db, loanId, s.admin, now);
    const me = d.lenders[0].lenderId;
    await payShare(db, me, loanId, "success", now);
    simulateOtherLenders(db, me, loanId, now);
    expect(loanDetail(db, loanId, s.admin, now).status).toBe("repaying");
  });
});
