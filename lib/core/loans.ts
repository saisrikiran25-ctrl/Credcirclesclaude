import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { schema } from "@/lib/db";
import type { Db } from "@/lib/db";
import { LIMITS } from "@/lib/domain/constants";
import { buildSchedule, instalmentStatus, restructureSchedule, scheduleTotals, type InstalmentStatus } from "@/lib/domain/emi";
import { diversificationNudges, recommendedMaxExposure } from "@/lib/domain/exposure";
import { latePenalty, type PenaltyPolicy } from "@/lib/domain/penalty";
import { formatINR } from "@/lib/domain/money";
import { allocateLenders, shareLoss } from "@/lib/domain/riskSharing";
import { requiredApprovals, tallyVotes } from "@/lib/domain/voting";
import { loanRequestSchema, platformFee } from "@/lib/domain/validation";
import { services } from "@/lib/services/simulated";
import {
  AppError, activeMemberIds, appendLedger, getMembership, getUser, newId, notify, requireAdmin, requireMember, requireVerified,
  type DbLike, type LoanRow, type Tx,
} from "./shared";
import { circleStats, circleTotals, loanOutstanding, memberCapacity, riskForUser } from "./stats";

const {
  loans, votes, comments, loanLenders, instalments, repayments, mandates, riskSnapshots, restructureProposals,
  restructureVotes, platformFees, circles, users,
} = schema;

const HOUR = 3600 * 1000;
const EXTERNAL_MIN = LIMITS.externalMinRiskScore;

const policyOf = (l: Pick<LoanRow, "latePenaltyType" | "latePenaltyValue">): PenaltyPolicy =>
  l.latePenaltyType === "flat" ? { type: "flat", amount: l.latePenaltyValue } : { type: "pct", pct: l.latePenaltyValue };

const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Please check the form";

function getLoan(db: DbLike, loanId: string): LoanRow {
  const l = db.select().from(loans).where(eq(loans.id, loanId)).get();
  if (!l) throw new AppError("Loan not found", "not_found");
  return l;
}

/** Amount already promised to approved-but-not-yet-disbursed loans. */
function committedAmount(db: DbLike, circleId: string): number {
  return db.select().from(loans).where(and(eq(loans.circleId, circleId), eq(loans.status, "approved"))).all().reduce((a, l) => a + l.amount, 0);
}

export interface RequestContext {
  circle: typeof circles.$inferSelect;
  isMember: boolean;
  /** null when the user can borrow here; otherwise the plain-English reason they cannot. */
  blocked: string | null;
  isExternal: boolean;
  risk: ReturnType<typeof riskForUser>;
  pool: number;
  committed: number;
  lenderCapacity: number;
  recommendedMax: number;
  nudges: ReturnType<typeof diversificationNudges>;
  maxAmount: number;
}

/** What the loan-request screen shows BEFORE the person asks: risk, liquidity, recommended exposure. */
export function requestContext(db: DbLike, userId: string, circleId: string, now: Date): RequestContext {
  const circle = db.select().from(circles).where(eq(circles.id, circleId)).get();
  if (!circle) throw new AppError("Circle not found", "not_found");
  const user = getUser(db, userId);
  const membership = getMembership(db, circleId, userId);
  const isMember = !!membership;
  const risk = riskForUser(db, userId, now);
  const totals = circleTotals(db, circleId);
  const committed = committedAmount(db, circleId);
  const cap = memberCapacity(db, circleId);
  const lenderCapacity = [...cap].filter(([uid]) => uid !== userId).reduce((a, [, v]) => a + Math.max(v, 0), 0) - committed;
  const stats = circleStats(db, circleId, now);
  const recommendedMax = recommendedMaxExposure(totals.pool - committed, circle.maxLoan);

  let blocked: string | null = null;
  if (user.kycStatus !== "verified") blocked = "Complete eKYC verification to borrow.";
  else if (!isMember) {
    if (circle.complianceMode === "C") blocked = "This circle runs in Closed mode: only members can borrow. Outside borrowing is switched off by the circle's compliance setting.";
    else if (!user.vetted && !(risk.score !== null && risk.score >= EXTERNAL_MIN)) {
      blocked = `Outside borrowers must be vetted: a verified profile plus a risk score of ${EXTERNAL_MIN}+ (or admin vetting).`;
    }
  }
  const open = db.select().from(loans).where(and(eq(loans.circleId, circleId), eq(loans.borrowerId, userId), inArray(loans.status, ["voting", "approved", "repaying"]))).get();
  if (!blocked && open) blocked = "You already have an open loan in this circle. Close it before requesting another.";

  const maxAmount = Math.max(0, Math.min(circle.maxLoan, LIMITS.loanMax, lenderCapacity));
  return {
    circle, isMember, blocked, isExternal: !isMember, risk, pool: totals.pool, committed, lenderCapacity, recommendedMax, maxAmount,
    nudges: diversificationNudges({
      pool: totals.pool + totals.outstanding, available: totals.pool - committed, circleMaxLoan: circle.maxLoan,
      outstandingByBorrower: stats.exposureByBorrower.map((b) => ({ borrowerId: b.borrowerId, name: b.name, amount: b.amount })),
    }),
  };
}

export function requestLoan(db: Db, userId: string, circleId: string, raw: unknown, now: Date): string {
  const user = getUser(db, userId);
  requireVerified(user);
  const ctx = requestContext(db, userId, circleId, now);
  if (ctx.blocked) throw new AppError(ctx.blocked, "forbidden");
  const parsed = loanRequestSchema.safeParse(raw);
  if (!parsed.success) throw new AppError(firstIssue(parsed.error));
  const v = parsed.data;
  const circle = ctx.circle;
  if (v.amount > circle.maxLoan) throw new AppError(`This circle's max loan per member is ${formatINR(circle.maxLoan)}.`);
  if (v.amount > ctx.lenderCapacity) {
    throw new AppError(`The circle's lending capacity is ${formatINR(Math.max(ctx.lenderCapacity, 0))} right now, which is below ${formatINR(v.amount)}. Try a smaller amount.`);
  }
  const fee = platformFee(v.amount);
  return db.transaction((tx) => {
    const id = newId();
    tx.insert(loans).values({
      id,
      circleId,
      borrowerId: userId,
      amount: v.amount,
      purpose: v.purpose,
      tenureMonths: v.tenureMonths,
      interestPct: v.interestPct,
      note: v.note ?? null,
      isExternal: ctx.isExternal,
      status: "voting",
      thresholdPct: circle.approvalThresholdPct,
      latePenaltyType: circle.latePenaltyType,
      latePenaltyValue: circle.latePenaltyValue,
      platformFeePct: LIMITS.platformFeeDefaultPct,
      platformFee: fee,
      complianceMode: circle.complianceMode,
      votingEndsAt: new Date(now.getTime() + circle.votingWindowHours * HOUR),
      riskScoreAtRequest: ctx.risk.score,
      createdAt: now,
    }).run();
    tx.insert(riskSnapshots).values({ id: newId(), userId, score: ctx.risk.score, band: ctx.risk.band, factorsJson: JSON.stringify(ctx.risk.factors), createdAt: now }).run();
    for (const uid of activeMemberIds(tx, circleId)) {
      if (uid === userId) continue;
      notify(tx, uid, { kind: "vote", title: "Vote needed", body: `${user.name} requested ${formatINR(v.amount)} in ${circle.name}.`, href: `/loans/${id}` }, now);
    }
    return id;
  });
}

// ---------- voting ----------

export function voteState(db: DbLike, loan: LoanRow, windowClosed = false) {
  const members = activeMemberIds(db, loan.circleId).filter((id) => id !== loan.borrowerId);
  const rows = db.select().from(votes).where(eq(votes.loanId, loan.id)).all().filter((v) => members.includes(v.userId));
  const approvals = rows.filter((v) => v.choice === "approve").length;
  const rejections = rows.filter((v) => v.choice === "reject").length;
  const tally = tallyVotes({ eligible: members.length, thresholdPct: loan.thresholdPct, approvals, rejections, windowClosed });
  return { eligible: members, votes: rows, tally };
}

function rejectLoan(tx: Tx, loan: LoanRow, reason: string, now: Date) {
  tx.update(loans).set({ status: "rejected", closedAt: now }).where(eq(loans.id, loan.id)).run();
  notify(tx, loan.borrowerId, { kind: "info", title: "Loan request not approved", body: reason, href: `/loans/${loan.id}` }, now);
}

/** Pick the fewest lenders (max 4) who can cover the loan, split in proportion to their capacity. */
function approveLoan(tx: Tx, loan: LoanRow, now: Date) {
  const cap = memberCapacity(tx, loan.circleId);
  const candidates = [...cap]
    .filter(([uid, c]) => uid !== loan.borrowerId && c > 0 && !!getMembership(tx, loan.circleId, uid))
    .map(([lenderId, available]) => ({ lenderId, available }))
    .sort((a, b) => b.available - a.available);
  let chosen: typeof candidates = [];
  let running = 0;
  for (const c of candidates) {
    chosen.push(c);
    running += c.available;
    if (running >= loan.amount && chosen.length >= 1) break;
  }
  if (chosen.length > 4 && running >= loan.amount) chosen = chosen.slice(0, 4);
  let shares;
  try {
    shares = allocateLenders(loan.amount, chosen);
  } catch {
    rejectLoan(tx, loan, "Members approved, but the circle no longer has enough lending capacity. Try a smaller amount.", now);
    return;
  }
  tx.update(loans).set({ status: "approved", approvedAt: now }).where(eq(loans.id, loan.id)).run();
  const borrower = getUser(tx, loan.borrowerId);
  for (const s of shares) {
    tx.insert(loanLenders).values({ id: newId(), loanId: loan.id, lenderId: s.lenderId, amount: s.amount, status: "pending" }).run();
    notify(tx, s.lenderId, { kind: "approved", title: "Pay your share", body: `Loan to ${borrower.name} approved. Your share: ${formatINR(s.amount)} by UPI, straight to the borrower.`, href: `/loans/${loan.id}` }, now);
  }
  notify(tx, loan.borrowerId, { kind: "approved", title: "Your loan was approved", body: "Lenders will now pay you directly by UPI.", href: `/loans/${loan.id}` }, now);
}

function evaluateVote(tx: Tx, loanId: string, now: Date, windowClosed: boolean) {
  const loan = getLoan(tx, loanId);
  if (loan.status !== "voting") return;
  const { tally } = voteState(tx, loan, windowClosed);
  if (tally.status === "approved") approveLoan(tx, loan, now);
  else if (tally.status === "rejected") rejectLoan(tx, loan, tally.reason + ".", now);
}

export function castVote(db: Db, userId: string, loanId: string, choice: "approve" | "reject", comment: string | undefined, now: Date) {
  const user = getUser(db, userId);
  requireVerified(user);
  const loan = getLoan(db, loanId);
  requireMember(db, loan.circleId, userId);
  if (loan.borrowerId === userId) throw new AppError("You cannot vote on your own request.", "forbidden");
  if (loan.status !== "voting") throw new AppError("Voting on this request is closed.", "conflict");
  if (now.getTime() > loan.votingEndsAt.getTime()) {
    db.transaction((tx) => evaluateVote(tx, loanId, now, true));
    throw new AppError("The voting window has closed.", "conflict");
  }
  db.transaction((tx) => {
    const existing = tx.select().from(votes).where(and(eq(votes.loanId, loanId), eq(votes.userId, userId))).get();
    const text = comment?.trim() ? comment.trim().slice(0, 280) : null;
    if (existing) tx.update(votes).set({ choice, comment: text, createdAt: now }).where(eq(votes.id, existing.id)).run();
    else tx.insert(votes).values({ id: newId(), loanId, userId, choice, comment: text, createdAt: now }).run();
    evaluateVote(tx, loanId, now, false);
  });
}

export function addComment(db: Db, userId: string, loanId: string, body: string, kind: "comment" | "mediation", now: Date) {
  const loan = getLoan(db, loanId);
  const isBorrower = loan.borrowerId === userId;
  if (!isBorrower) requireMember(db, loan.circleId, userId);
  const text = body.trim();
  if (text.length < 2) throw new AppError("Write a short note first.");
  db.insert(comments).values({ id: newId(), loanId, userId, body: text.slice(0, 500), kind, createdAt: now }).run();
  if (kind === "mediation") {
    const who = getUser(db, userId).name;
    for (const uid of new Set([loan.borrowerId, ...activeMemberIds(db, loan.circleId)])) {
      if (uid !== userId) notify(db, uid, { kind: "info", title: "Mediation note added", body: `${who} added a note on a loan.`, href: `/loans/${loanId}` }, now);
    }
  }
}

/** Demo/admin action: end the vote now. Approved only if the threshold was met. */
export function closeVote(db: Db, adminId: string, loanId: string, now: Date) {
  const loan = getLoan(db, loanId);
  requireAdmin(db, loan.circleId, adminId);
  if (loan.status !== "voting") throw new AppError("This vote is already closed.", "conflict");
  db.transaction((tx) => evaluateVote(tx, loanId, now, true));
}

// ---------- disbursement (lender -> borrower, directly by UPI) ----------

function activateLoan(tx: Tx, loan: LoanRow, now: Date) {
  const plan = buildSchedule({ principal: loan.amount, annualRatePct: loan.interestPct, months: loan.tenureMonths, start: now });
  for (const p of plan) {
    tx.insert(instalments).values({ id: newId(), loanId: loan.id, number: p.number, dueDate: p.dueDate, principal: p.principal, interest: p.interest, penalty: 0, state: "active" }).run();
  }
  tx.update(loans).set({ status: "repaying", disbursedAt: now }).where(eq(loans.id, loan.id)).run();
  // The platform fee is paid by the borrower straight to the platform. It never enters the pool.
  appendLedger(tx, { circleId: loan.circleId, loanId: loan.id, actorId: loan.borrowerId, type: "PLATFORM_FEE", amount: loan.platformFee, memo: `Platform fee ${loan.platformFeePct}%`, at: now });
  tx.insert(platformFees).values({ id: newId(), loanId: loan.id, circleId: loan.circleId, amount: loan.platformFee, createdAt: now }).run();
  notify(tx, loan.borrowerId, { kind: "info", title: "Money received", body: `All lenders have paid. First instalment of ${formatINR(plan[0].total)} is due ${plan[0].dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`, href: `/loans/${loan.id}` }, now);
}

function maybeActivate(tx: Tx, loanId: string, now: Date) {
  const loan = getLoan(tx, loanId);
  if (loan.status !== "approved") return;
  const shares = tx.select().from(loanLenders).where(eq(loanLenders.loanId, loanId)).all();
  if (shares.length > 0 && shares.every((s) => s.status === "paid")) activateLoan(tx, loan, now);
}

export function disbursementLink(db: DbLike, loanId: string, lenderId: string) {
  const loan = getLoan(db, loanId);
  const borrower = getUser(db, loan.borrowerId);
  const lender = getUser(db, lenderId);
  const share = db.select().from(loanLenders).where(and(eq(loanLenders.loanId, loanId), eq(loanLenders.lenderId, lenderId))).get();
  if (!share) return null;
  const req = {
    payerVpa: lender.vpa, payeeVpa: borrower.vpa, payeeName: borrower.name, amountPaise: share.amount,
    note: `Circlo loan: ${loan.purpose}`, reference: `LN-${loan.id.slice(0, 8).toUpperCase()}`,
  };
  return { link: services.upi.buildLink(req), req, share };
}

export async function payShare(db: Db, userId: string, loanId: string, outcome: "success" | "failure", now: Date) {
  const loan = getLoan(db, loanId);
  if (loan.status !== "approved") throw new AppError("This loan is not waiting for payment.", "conflict");
  const info = disbursementLink(db, loanId, userId);
  if (!info || info.share.status === "paid") throw new AppError("You have no payment due on this loan.", "forbidden");
  const res = await services.upi.settle(info.req, outcome);
  if (res.status === "failed") {
    db.transaction((tx) => {
      tx.update(loanLenders).set({ status: "failed", upiRef: res.upiRef }).where(eq(loanLenders.id, info.share.id)).run();
      appendLedger(tx, { circleId: loan.circleId, loanId, actorId: userId, type: "DISBURSEMENT", amount: info.share.amount, status: "failed", memo: `Failed attempt: ${res.reason}`, at: now });
    });
    return { ok: false as const, message: res.reason, upiRef: res.upiRef };
  }
  db.transaction((tx) => {
    tx.update(loanLenders).set({ status: "paid", upiRef: res.upiRef, paidAt: now }).where(eq(loanLenders.id, info.share.id)).run();
    appendLedger(tx, { circleId: loan.circleId, loanId, actorId: userId, type: "DISBURSEMENT", amount: info.share.amount, memo: `UPI ${res.upiRef} to borrower`, at: now });
    maybeActivate(tx, loanId, now);
  });
  return { ok: true as const, message: `${formatINR(info.share.amount)} sent to the borrower`, upiRef: res.upiRef };
}

/** Prototype convenience: lets a reviewer settle every other lender's share so the flow can finish. */
export function simulateOtherLenders(db: Db, userId: string, loanId: string, now: Date) {
  const loan = getLoan(db, loanId);
  requireMember(db, loan.circleId, userId);
  if (loan.status !== "approved") throw new AppError("This loan is not waiting for payment.", "conflict");
  db.transaction((tx) => {
    const pending = tx.select().from(loanLenders).where(and(eq(loanLenders.loanId, loanId), ne(loanLenders.status, "paid"), ne(loanLenders.lenderId, userId))).all();
    for (const s of pending) {
      const ref = `UPI-DEMO-${newId().slice(0, 6).toUpperCase()}`;
      tx.update(loanLenders).set({ status: "paid", upiRef: ref, paidAt: now }).where(eq(loanLenders.id, s.id)).run();
      appendLedger(tx, { circleId: loan.circleId, loanId, actorId: s.lenderId, type: "DISBURSEMENT", amount: s.amount, memo: `UPI ${ref} to borrower (demo-simulated lender)`, at: now });
    }
    maybeActivate(tx, loanId, now);
  });
}

// ---------- repayment ----------

function activeInstalments(db: DbLike, loanId: string) {
  return db.select().from(instalments).where(and(eq(instalments.loanId, loanId), eq(instalments.state, "active"))).orderBy(asc(instalments.number)).all();
}

/** Charge one late penalty on each overdue, unpaid instalment (once). */
function chargePenalties(tx: Tx, loan: LoanRow, now: Date) {
  if (loan.status !== "repaying") return;
  for (const i of activeInstalments(tx, loan.id)) {
    if (i.paidAt || i.penaltyChargedAt) continue;
    if (instalmentStatus(i.dueDate, now, false) !== "overdue") continue;
    const penalty = latePenalty(i.principal + i.interest, policyOf(loan));
    tx.update(instalments).set({ penalty, penaltyChargedAt: now }).where(eq(instalments.id, i.id)).run();
    notify(tx, loan.borrowerId, { kind: "overdue", title: "Instalment overdue", body: `Instalment ${i.number} is overdue. A late fee of ${formatINR(penalty)} was added under the circle's rules.`, href: `/loans/${loan.id}` }, now);
    const circle = tx.select().from(circles).where(eq(circles.id, loan.circleId)).get();
    if (circle && circle.creatorId !== loan.borrowerId) {
      notify(tx, circle.creatorId, { kind: "overdue", title: "A loan is overdue", body: `${getUser(tx, loan.borrowerId).name} missed instalment ${i.number}.`, href: `/loans/${loan.id}` }, now);
    }
  }
}

function payNextInstalment(tx: Tx, loan: LoanRow, payerId: string, method: "autopay" | "manual", upiRef: string, now: Date) {
  chargePenalties(tx, loan, now);
  const next = activeInstalments(tx, loan.id).find((i) => !i.paidAt);
  if (!next) throw new AppError("Nothing left to pay on this loan.", "conflict");
  tx.update(instalments).set({ paidAt: now }).where(eq(instalments.id, next.id)).run();
  tx.insert(repayments).values({
    id: newId(), loanId: loan.id, instalmentId: next.id, payerId, principal: next.principal, interest: next.interest, penalty: next.penalty, method, upiRef, createdAt: now,
  }).run();
  const memo = `Instalment ${next.number} via ${method === "autopay" ? "AutoPay" : "UPI"} ${upiRef}`;
  appendLedger(tx, { circleId: loan.circleId, loanId: loan.id, actorId: payerId, type: "REPAY_PRINCIPAL", amount: next.principal, memo, at: now });
  if (next.interest > 0) appendLedger(tx, { circleId: loan.circleId, loanId: loan.id, actorId: payerId, type: "REPAY_INTEREST", amount: next.interest, memo, at: now });
  if (next.penalty > 0) appendLedger(tx, { circleId: loan.circleId, loanId: loan.id, actorId: payerId, type: "PENALTY", amount: next.penalty, memo: `Late fee, ${memo}`, at: now });
  const remaining = activeInstalments(tx, loan.id).filter((i) => !i.paidAt);
  if (remaining.length === 0) {
    tx.update(loans).set({ status: "closed", closedAt: now }).where(eq(loans.id, loan.id)).run();
    notify(tx, loan.borrowerId, { kind: "repaid", title: "Loan fully repaid", body: "Thank you. This loan is closed and your record is updated.", href: `/loans/${loan.id}` }, now);
    const shares = tx.select().from(loanLenders).where(eq(loanLenders.loanId, loan.id)).all();
    for (const s of shares) notify(tx, s.lenderId, { kind: "repaid", title: "Loan repaid in full", body: "Principal and interest are back in the circle pool.", href: `/loans/${loan.id}` }, now);
  } else {
    for (const s of tx.select().from(loanLenders).where(eq(loanLenders.loanId, loan.id)).all()) {
      notify(tx, s.lenderId, { kind: "repaid", title: "Repayment received", body: `Instalment ${next.number} was paid.`, href: `/loans/${loan.id}` }, now);
    }
  }
  return next;
}

export function repaymentBreakdown(db: DbLike, loanId: string, amount: number) {
  const loan = getLoan(db, loanId);
  const shares = db.select().from(loanLenders).where(eq(loanLenders.loanId, loanId)).all();
  const parts = (() => {
    const sum = shares.reduce((a, s) => a + s.amount, 0) || 1;
    let left = amount;
    return shares.map((s, i) => {
      const part = i === shares.length - 1 ? left : Math.floor((amount * s.amount) / sum);
      left -= part;
      return { lender: getUser(db, s.lenderId), amount: part };
    });
  })();
  const borrower = getUser(db, loan.borrowerId);
  return parts.map((p) => ({
    lenderId: p.lender.id, name: p.lender.name, vpa: p.lender.vpa, amount: p.amount,
    link: services.upi.buildLink({ payerVpa: borrower.vpa, payeeVpa: p.lender.vpa, payeeName: p.lender.name, amountPaise: p.amount, note: `Circlo repayment`, reference: `RP-${loan.id.slice(0, 8).toUpperCase()}` }),
  }));
}

export async function repayManual(db: Db, userId: string, loanId: string, outcome: "success" | "failure", now: Date) {
  const loan = getLoan(db, loanId);
  if (loan.borrowerId !== userId) throw new AppError("Only the borrower repays.", "forbidden");
  if (loan.status !== "repaying") throw new AppError("This loan is not in repayment.", "conflict");
  const next = activeInstalments(db, loanId).find((i) => !i.paidAt);
  if (!next) throw new AppError("Nothing left to pay.", "conflict");
  const owed = next.principal + next.interest + (next.penalty || (instalmentStatus(next.dueDate, now, false) === "overdue" ? latePenalty(next.principal + next.interest, policyOf(loan)) : 0));
  const borrower = getUser(db, userId);
  const res = await services.upi.settle({ payerVpa: borrower.vpa, payeeVpa: "lenders@circlo", payeeName: "Circle lenders", amountPaise: owed, note: "Circlo repayment", reference: `RP-${loan.id.slice(0, 8).toUpperCase()}` }, outcome);
  if (res.status === "failed") {
    appendLedger(db, { circleId: loan.circleId, loanId, actorId: userId, type: "REPAY_PRINCIPAL", amount: next.principal, status: "failed", memo: `Failed attempt: ${res.reason}`, at: now });
    return { ok: false as const, message: res.reason, upiRef: res.upiRef };
  }
  db.transaction((tx) => payNextInstalment(tx, loan, userId, "manual", res.upiRef, now));
  return { ok: true as const, message: "Repayment recorded", upiRef: res.upiRef };
}

export async function setupMandate(db: Db, userId: string, loanId: string, now: Date) {
  const loan = getLoan(db, loanId);
  if (loan.borrowerId !== userId) throw new AppError("Only the borrower sets up AutoPay.", "forbidden");
  if (loan.status !== "repaying") throw new AppError("AutoPay can be set up once the loan is being repaid.", "conflict");
  const borrower = getUser(db, userId);
  const biggest = Math.max(...activeInstalments(db, loanId).map((i) => i.principal + i.interest + i.penalty));
  const { mandateRef } = await services.upi.registerMandate({ vpa: borrower.vpa, maxAmountPaise: biggest });
  db.transaction((tx) => {
    tx.update(mandates).set({ status: "cancelled" }).where(and(eq(mandates.loanId, loanId), eq(mandates.status, "active"))).run();
    tx.insert(mandates).values({ id: newId(), loanId, borrowerId: userId, vpa: borrower.vpa, status: "active", createdAt: now }).run();
  });
  return mandateRef;
}

export function cancelMandate(db: Db, userId: string, loanId: string) {
  const loan = getLoan(db, loanId);
  if (loan.borrowerId !== userId) throw new AppError("Only the borrower can cancel AutoPay.", "forbidden");
  db.update(mandates).set({ status: "cancelled" }).where(and(eq(mandates.loanId, loanId), eq(mandates.status, "active"))).run();
}

/** Demo: run the next AutoPay debit now (a real mandate fires on the due date). */
export function runAutopayNow(db: Db, userId: string, loanId: string, now: Date) {
  const loan = getLoan(db, loanId);
  if (loan.borrowerId !== userId) throw new AppError("Only the borrower can run AutoPay.", "forbidden");
  const m = db.select().from(mandates).where(and(eq(mandates.loanId, loanId), eq(mandates.status, "active"))).get();
  if (!m) throw new AppError("Set up the AutoPay mandate first.", "conflict");
  if (loan.status !== "repaying") throw new AppError("This loan is not in repayment.", "conflict");
  db.transaction((tx) => payNextInstalment(tx, loan, userId, "autopay", `AP-${newId().slice(0, 8).toUpperCase()}`, now));
}

// ---------- restructure, mediation, default ----------

export function proposeRestructure(db: Db, userId: string, loanId: string, newMonths: number, reason: string, now: Date) {
  const loan = getLoan(db, loanId);
  if (loan.status !== "repaying") throw new AppError("Only a loan in repayment can be restructured.", "conflict");
  if (loan.borrowerId !== userId) requireAdmin(db, loan.circleId, userId);
  if (!Number.isInteger(newMonths) || newMonths < 1 || newMonths > 12) throw new AppError("New tenure must be 1-12 months.");
  if (reason.trim().length < 5) throw new AppError("Add a short reason so the circle can decide.");
  const open = db.select().from(restructureProposals).where(and(eq(restructureProposals.loanId, loanId), eq(restructureProposals.status, "open"))).get();
  if (open) throw new AppError("A restructure proposal is already open.", "conflict");
  db.transaction((tx) => {
    const id = newId();
    tx.insert(restructureProposals).values({ id, loanId, proposerId: userId, newMonths, reason: reason.trim().slice(0, 300), status: "open", createdAt: now }).run();
    for (const uid of activeMemberIds(tx, loan.circleId)) {
      if (uid === loan.borrowerId) continue;
      notify(tx, uid, { kind: "vote", title: "Restructure vote", body: "A loan restructure needs the circle's decision.", href: `/loans/${loanId}` }, now);
    }
  });
}

export function voteRestructure(db: Db, userId: string, proposalId: string, choice: "approve" | "reject", now: Date) {
  const p = db.select().from(restructureProposals).where(eq(restructureProposals.id, proposalId)).get();
  if (!p || p.status !== "open") throw new AppError("This proposal is closed.", "conflict");
  const loan = getLoan(db, p.loanId);
  requireMember(db, loan.circleId, userId);
  if (loan.borrowerId === userId) throw new AppError("The borrower cannot vote on their own restructure.", "forbidden");
  db.transaction((tx) => {
    const ex = tx.select().from(restructureVotes).where(and(eq(restructureVotes.proposalId, proposalId), eq(restructureVotes.userId, userId))).get();
    if (ex) tx.update(restructureVotes).set({ choice, createdAt: now }).where(eq(restructureVotes.id, ex.id)).run();
    else tx.insert(restructureVotes).values({ id: newId(), proposalId, userId, choice, createdAt: now }).run();
    const eligible = activeMemberIds(tx, loan.circleId).filter((id) => id !== loan.borrowerId);
    const rows = tx.select().from(restructureVotes).where(eq(restructureVotes.proposalId, proposalId)).all().filter((v) => eligible.includes(v.userId));
    const t = tallyVotes({ eligible: eligible.length, thresholdPct: loan.thresholdPct, approvals: rows.filter((r) => r.choice === "approve").length, rejections: rows.filter((r) => r.choice === "reject").length });
    if (t.status === "approved") applyRestructure(tx, loan, p, now);
    else if (t.status === "rejected") {
      tx.update(restructureProposals).set({ status: "rejected", decidedAt: now }).where(eq(restructureProposals.id, proposalId)).run();
      notify(tx, loan.borrowerId, { kind: "info", title: "Restructure not approved", body: "The circle did not approve the new schedule.", href: `/loans/${loan.id}` }, now);
    }
  });
}

function applyRestructure(tx: Tx, loan: LoanRow, p: typeof restructureProposals.$inferSelect, now: Date) {
  const unpaid = activeInstalments(tx, loan.id).filter((i) => !i.paidAt);
  const remaining = unpaid.reduce((a, i) => a + i.principal, 0);
  const carriedPenalty = unpaid.reduce((a, i) => a + (i.penaltyChargedAt ? i.penalty : 0), 0);
  const lastNumber = Math.max(...activeInstalments(tx, loan.id).map((i) => i.number));
  for (const i of unpaid) tx.update(instalments).set({ state: "superseded" }).where(eq(instalments.id, i.id)).run();
  const plan = restructureSchedule({ remainingPrincipal: remaining, annualRatePct: loan.interestPct, newMonths: p.newMonths, start: now });
  plan.forEach((r, idx) => {
    tx.insert(instalments).values({
      id: newId(), loanId: loan.id, number: lastNumber + r.number, dueDate: r.dueDate, principal: r.principal, interest: r.interest,
      penalty: idx === 0 ? carriedPenalty : 0, penaltyChargedAt: idx === 0 && carriedPenalty > 0 ? now : null, state: "active",
    }).run();
  });
  tx.update(loans).set({ restructuredAt: now }).where(eq(loans.id, loan.id)).run();
  tx.update(restructureProposals).set({ status: "approved", decidedAt: now }).where(eq(restructureProposals.id, p.id)).run();
  tx.update(mandates).set({ status: "cancelled" }).where(and(eq(mandates.loanId, loan.id), eq(mandates.status, "active"))).run();
  notify(tx, loan.borrowerId, { kind: "info", title: "Loan restructured", body: `New schedule: ${p.newMonths} instalment(s) on the remaining ${formatINR(remaining)}. Set up AutoPay again if you use it.`, href: `/loans/${loan.id}` }, now);
}

export function lossSharesForLoan(db: DbLike, loanId: string) {
  const shares = db.select().from(loanLenders).where(and(eq(loanLenders.loanId, loanId), eq(loanLenders.status, "paid"))).all();
  const loss = activeInstalments(db, loanId).filter((i) => !i.paidAt).reduce((a, i) => a + i.principal, 0);
  const names = new Map(db.select().from(users).all().map((u) => [u.id, u.name]));
  return {
    loss,
    shares: shareLoss(loss, shares.map((s) => ({ lenderId: s.lenderId, amount: s.amount }))).map((s) => ({ ...s, name: names.get(s.lenderId) ?? "Lender" })),
  };
}

/** Admin marks a long-overdue loan as defaulted: the unpaid principal is written off and shared by lenders. */
export function markDefault(db: Db, adminId: string, loanId: string, now: Date) {
  const loan = getLoan(db, loanId);
  requireAdmin(db, loan.circleId, adminId);
  if (loan.status !== "repaying") throw new AppError("Only a loan in repayment can be marked as defaulted.", "conflict");
  const overdue = activeInstalments(db, loanId).some((i) => !i.paidAt && instalmentStatus(i.dueDate, now, false) === "overdue");
  if (!overdue) throw new AppError("There is no overdue instalment on this loan.", "conflict");
  const { loss, shares } = lossSharesForLoan(db, loanId);
  db.transaction((tx) => {
    tx.update(loans).set({ status: "defaulted", defaultedAt: now }).where(eq(loans.id, loanId)).run();
    tx.update(mandates).set({ status: "cancelled" }).where(and(eq(mandates.loanId, loanId), eq(mandates.status, "active"))).run();
    appendLedger(tx, { circleId: loan.circleId, loanId, actorId: adminId, type: "WRITE_OFF", amount: loss, memo: "Default: unpaid principal written off and shared by lenders", at: now });
    for (const s of shares) {
      notify(tx, s.lenderId, { kind: "overdue", title: "A loan you funded defaulted", body: `Your share of the loss is ${formatINR(s.loss)} (${Math.round(s.pct)}% of the loan, in proportion to what you funded).`, href: `/loans/${loanId}` }, now);
    }
  });
}

// ---------- background-style sweep (run lazily on page loads) ----------

/** Closes expired votes, charges late fees once, runs due AutoPay debits, sends reminders. Idempotent. */
export function sweep(db: Db, now: Date) {
  db.transaction((tx) => {
    for (const l of tx.select().from(loans).where(eq(loans.status, "voting")).all()) {
      if (now.getTime() > l.votingEndsAt.getTime()) evaluateVote(tx, l.id, now, true);
    }
    for (const l of tx.select().from(loans).where(eq(loans.status, "repaying")).all()) {
      const m = tx.select().from(mandates).where(and(eq(mandates.loanId, l.id), eq(mandates.status, "active"))).get();
      if (m) {
        // AutoPay debits any instalment whose due date has arrived
        for (;;) {
          const cur = tx.select().from(loans).where(eq(loans.id, l.id)).get();
          if (!cur || cur.status !== "repaying") break;
          const next = activeInstalments(tx, l.id).find((i) => !i.paidAt);
          if (!next || next.dueDate.getTime() > now.getTime()) break;
          payNextInstalment(tx, cur, cur.borrowerId, "autopay", `AP-${newId().slice(0, 8).toUpperCase()}`, now);
        }
      }
      const cur = tx.select().from(loans).where(eq(loans.id, l.id)).get();
      if (!cur || cur.status !== "repaying") continue;
      chargePenalties(tx, cur, now);
      const next = activeInstalments(tx, l.id).find((i) => !i.paidAt);
      if (next && instalmentStatus(next.dueDate, now, false) === "due") {
        const href = `/loans/${l.id}`;
        const title = `Instalment ${next.number} due soon`;
        const dup = tx.select().from(schema.notifications).where(and(eq(schema.notifications.userId, l.borrowerId), eq(schema.notifications.href, href), eq(schema.notifications.title, title))).get();
        if (!dup) notify(tx, l.borrowerId, { kind: "due", title, body: `${formatINR(next.principal + next.interest)} is due on ${next.dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`, href }, now);
      }
    }
  });
}

// ---------- read models ----------

export type DisplayStatus = "voting" | "approved" | "repaying" | "overdue" | "restructured" | "closed" | "defaulted" | "rejected";

export function displayStatus(loan: LoanRow, hasOverdue: boolean): DisplayStatus {
  if (loan.status === "repaying") return hasOverdue ? "overdue" : loan.restructuredAt ? "restructured" : "repaying";
  if (loan.status === "closed" && loan.restructuredAt) return "closed";
  return loan.status as DisplayStatus;
}

export function loanDetail(db: DbLike, loanId: string, viewerId: string, now: Date) {
  const loan = getLoan(db, loanId);
  const isBorrower = loan.borrowerId === viewerId;
  const membership = getMembership(db, loan.circleId, viewerId);
  if (!isBorrower && !membership) throw new AppError("Only circle members and the borrower can see this loan.", "forbidden");
  const circle = db.select().from(circles).where(eq(circles.id, loan.circleId)).get()!;
  const borrower = getUser(db, loan.borrowerId);
  const names = new Map(db.select().from(users).all().map((u) => [u.id, u]));
  const insts = activeInstalments(db, loanId).map((i) => ({ ...i, status: instalmentStatus(i.dueDate, now, !!i.paidAt) as InstalmentStatus }));
  const hasOverdue = insts.some((i) => i.status === "overdue");
  const vs = voteState(db, loan, now.getTime() > loan.votingEndsAt.getTime());
  const lenders = db.select().from(loanLenders).where(eq(loanLenders.loanId, loanId)).all().map((s) => ({ ...s, name: names.get(s.lenderId)?.name ?? "Lender" }));
  const plan = insts.length ? scheduleTotals(insts.map((i) => ({ number: i.number, dueDate: i.dueDate, principal: i.principal, interest: i.interest, total: i.principal + i.interest }))) : null;
  const unpaid = insts.filter((i) => !i.paidAt);
  const proposal = db.select().from(restructureProposals).where(eq(restructureProposals.loanId, loanId)).orderBy(desc(restructureProposals.createdAt)).get() ?? null;
  const proposalVotes = proposal ? db.select().from(restructureVotes).where(eq(restructureVotes.proposalId, proposal.id)).all() : [];
  return {
    loan, circle, borrower, isBorrower, isAdmin: membership?.role === "admin", isMember: !!membership,
    status: displayStatus(loan, hasOverdue), hasOverdue,
    instalments: insts, plan,
    outstanding: unpaid.reduce((a, i) => a + i.principal, 0),
    interestAccrued: insts.filter((i) => i.paidAt || i.dueDate.getTime() <= now.getTime()).reduce((a, i) => a + i.interest, 0),
    penaltiesOwed: unpaid.reduce((a, i) => a + i.penalty, 0),
    nextInstalment: unpaid[0] ?? null,
    votes: vs.votes.map((v) => ({ ...v, name: names.get(v.userId)?.name ?? "Member" })),
    tally: vs.tally,
    eligibleCount: vs.eligible.length,
    required: requiredApprovals(vs.eligible.length, loan.thresholdPct),
    lenders,
    comments: db.select().from(comments).where(eq(comments.loanId, loanId)).orderBy(asc(comments.createdAt)).all().map((c) => ({ ...c, name: names.get(c.userId)?.name ?? "Member" })),
    mandate: db.select().from(mandates).where(and(eq(mandates.loanId, loanId), eq(mandates.status, "active"))).get() ?? null,
    repayments: db.select().from(repayments).where(eq(repayments.loanId, loanId)).orderBy(asc(repayments.createdAt)).all(),
    proposal, proposalVotes: proposalVotes.map((v) => ({ ...v, name: names.get(v.userId)?.name ?? "Member" })),
    escrow: circle.complianceMode === "A" || loan.complianceMode === "A"
      ? services.escrow.statusFor({ loanStatus: loan.status, hasDisbursed: !!loan.disbursedAt })
      : null,
    risk: riskForUser(db, loan.borrowerId, now),
    losses: loan.status === "defaulted" ? lossSharesForLoan(db, loanId) : null,
    outstandingNow: loan.status === "repaying" ? loanOutstanding(db, loanId) : 0,
  };
}
