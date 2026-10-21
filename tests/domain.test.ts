import { describe, expect, it } from "vitest";
import { rupees, LIMITS } from "@/lib/domain/constants";
import { formatINR, formatINRCompact, splitEvenly, splitProportionally } from "@/lib/domain/money";
import {
  addMonths, buildSchedule, emiPreview, instalmentStatus, interestAccrued, outstandingPrincipal,
  restructureSchedule, scheduleTotals, totalSimpleInterest,
} from "@/lib/domain/emi";
import { requiredApprovals, tallyVotes } from "@/lib/domain/voting";
import { computeRiskScore } from "@/lib/domain/risk";
import { diversificationNudges, recommendedMaxExposure } from "@/lib/domain/exposure";
import { latePenalty } from "@/lib/domain/penalty";
import { allocateLenders, shareLoss } from "@/lib/domain/riskSharing";
import { ledgerTotals, reconcilePool, type LedgerLike } from "@/lib/domain/ledger";
import {
  aadhaarSchema, circleRulesSchema, contributionSchema, loanRequestSchema, maskId, panSchema,
  platformFee, vpaSchema,
} from "@/lib/domain/validation";
import { buildUpiLink } from "@/lib/domain/upi";

const D = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe("money formatting", () => {
  it("uses Indian grouping", () => {
    expect(formatINR(rupees(125000))).toBe("₹1,25,000");
    expect(formatINR(rupees(999))).toBe("₹999");
    expect(formatINR(rupees(12345678))).toBe("₹1,23,45,678");
    expect(formatINR(-rupees(5000))).toBe("-₹5,000");
  });
  it("shows lakh / crore summaries", () => {
    expect(formatINRCompact(rupees(750000))).toBe("₹7.5 lakh");
    expect(formatINRCompact(rupees(2_00_00_000))).toBe("₹2 cr");
    expect(formatINRCompact(rupees(50000))).toBe("₹50,000");
  });
  it("splits exactly", () => {
    expect(splitEvenly(100, 3)).toEqual([34, 33, 33]);
    const parts = splitProportionally(10001, [3, 3, 4]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10001);
  });
});

describe("EMI & simple interest", () => {
  it("computes simple interest: 10,000 @ 10% for 6 months = 500", () => {
    expect(totalSimpleInterest(rupees(10000), 10, 6)).toBe(rupees(500));
  });
  it("builds a deterministic schedule that sums exactly", () => {
    const plan = buildSchedule({ principal: rupees(10000), annualRatePct: 10, months: 6, start: D(2026, 1, 15) });
    expect(plan).toHaveLength(6);
    const t = scheduleTotals(plan);
    expect(t.principal).toBe(rupees(10000));
    expect(t.interest).toBe(rupees(500));
    expect(plan[0].dueDate.toISOString().slice(0, 10)).toBe("2026-02-15");
    expect(plan[5].dueDate.toISOString().slice(0, 10)).toBe("2026-07-15");
    // same inputs -> same output
    expect(buildSchedule({ principal: rupees(10000), annualRatePct: 10, months: 6, start: D(2026, 1, 15) })).toEqual(plan);
  });
  it("spreads odd paise without losing any", () => {
    const plan = buildSchedule({ principal: 500001, annualRatePct: 9.5, months: 3, start: D(2026, 3, 1) });
    const t = scheduleTotals(plan);
    expect(t.principal).toBe(500001);
    expect(t.interest).toBe(totalSimpleInterest(500001, 9.5, 3));
  });
  it("clamps month-end dates", () => {
    expect(addMonths(D(2026, 1, 31), 1).toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(addMonths(D(2028, 1, 31), 1).toISOString().slice(0, 10)).toBe("2028-02-29");
  });
  it("one-month loan has one instalment", () => {
    const p = emiPreview(rupees(5000), 12, 1);
    expect(p.totalInterest).toBe(rupees(50));
    expect(p.emi).toBe(rupees(5050));
  });
  it("rejects bad input", () => {
    expect(() => buildSchedule({ principal: 0, annualRatePct: 10, months: 3, start: D(2026, 1, 1) })).toThrow();
    expect(() => buildSchedule({ principal: 100, annualRatePct: 10, months: 0, start: D(2026, 1, 1) })).toThrow();
  });
  it("tracks status: upcoming -> due -> overdue", () => {
    const due = D(2026, 5, 10);
    expect(instalmentStatus(due, D(2026, 5, 1), false)).toBe("upcoming");
    expect(instalmentStatus(due, D(2026, 5, 8), false)).toBe("due");
    expect(instalmentStatus(due, D(2026, 5, 10), false)).toBe("due");
    expect(instalmentStatus(due, D(2026, 5, 12), false)).toBe("overdue");
    expect(instalmentStatus(due, D(2026, 5, 12), true)).toBe("paid");
  });
  it("derives balance and accrued interest", () => {
    const plan = buildSchedule({ principal: rupees(6000), annualRatePct: 12, months: 3, start: D(2026, 1, 1) });
    const rows = plan.map((p, i) => ({ ...p, paid: i === 0 }));
    expect(outstandingPrincipal(rows)).toBe(rupees(4000));
    // 15 Feb: only instalment 1 (paid) has fallen due; instalment 2 is due on 1 Mar.
    expect(interestAccrued(rows, D(2026, 2, 15))).toBe(rows[0].interest);
    // 2 Mar: instalment 2 has now fallen due, so its interest is recognised too.
    expect(interestAccrued(rows, D(2026, 3, 2))).toBe(rows[0].interest + rows[1].interest);
  });
  it("restructures the remaining principal", () => {
    const plan = restructureSchedule({ remainingPrincipal: rupees(4000), annualRatePct: 10, newMonths: 4, start: D(2026, 4, 1) });
    expect(plan).toHaveLength(4);
    expect(scheduleTotals(plan).principal).toBe(rupees(4000));
  });
});

describe("approval threshold (70% default)", () => {
  it("computes required approvals without float errors", () => {
    expect(requiredApprovals(10, 70)).toBe(7);
    expect(requiredApprovals(3, 70)).toBe(3);
    expect(requiredApprovals(7, 70)).toBe(5);
    expect(requiredApprovals(20, 70)).toBe(14);
    expect(requiredApprovals(1, 70)).toBe(1);
    expect(requiredApprovals(0, 70)).toBe(Infinity);
  });
  it("approves exactly at the threshold, not one below", () => {
    expect(tallyVotes({ eligible: 10, thresholdPct: 70, approvals: 6, rejections: 0 }).status).toBe("pending");
    expect(tallyVotes({ eligible: 10, thresholdPct: 70, approvals: 7, rejections: 0 }).status).toBe("approved");
  });
  it("rejects early once the threshold is unreachable", () => {
    const t = tallyVotes({ eligible: 10, thresholdPct: 70, approvals: 2, rejections: 4 });
    expect(t.status).toBe("rejected");
  });
  it("rejects when the window closes short", () => {
    const t = tallyVotes({ eligible: 10, thresholdPct: 70, approvals: 5, rejections: 0, windowClosed: true });
    expect(t.status).toBe("rejected");
    expect(tallyVotes({ eligible: 10, thresholdPct: 70, approvals: 5, rejections: 0 }).status).toBe("pending");
  });
  it("reports progress toward the threshold", () => {
    expect(tallyVotes({ eligible: 10, thresholdPct: 70, approvals: 0, rejections: 0 }).progress).toBe(0);
    expect(tallyVotes({ eligible: 10, thresholdPct: 70, approvals: 7, rejections: 0 }).progress).toBe(1);
  });
  it("cannot approve with no eligible voters", () => {
    expect(tallyVotes({ eligible: 0, thresholdPct: 70, approvals: 0, rejections: 0 }).status).toBe("rejected");
  });
});

describe("rule validation", () => {
  it("interest 8-12%", () => {
    const base = { maxLoan: rupees(15000), approvalThresholdPct: 70, latePenaltyType: "flat" as const, latePenaltyValue: rupees(100) };
    expect(circleRulesSchema.safeParse({ ...base, interestPct: 7.9 }).success).toBe(false);
    expect(circleRulesSchema.safeParse({ ...base, interestPct: 8 }).success).toBe(true);
    expect(circleRulesSchema.safeParse({ ...base, interestPct: 12 }).success).toBe(true);
    expect(circleRulesSchema.safeParse({ ...base, interestPct: 12.1 }).success).toBe(false);
  });
  it("contribution 500-5000", () => {
    expect(contributionSchema.safeParse({ amount: rupees(499) }).success).toBe(false);
    expect(contributionSchema.safeParse({ amount: rupees(500) }).success).toBe(true);
    expect(contributionSchema.safeParse({ amount: rupees(5000) }).success).toBe(true);
    expect(contributionSchema.safeParse({ amount: rupees(5001) }).success).toBe(false);
  });
  it("loan 5k-20k, 1-6 months", () => {
    const ok = { amount: rupees(10000), purpose: "education", tenureMonths: 3, interestPct: 10 };
    expect(loanRequestSchema.safeParse(ok).success).toBe(true);
    expect(loanRequestSchema.safeParse({ ...ok, amount: rupees(4999) }).success).toBe(false);
    expect(loanRequestSchema.safeParse({ ...ok, amount: rupees(20001) }).success).toBe(false);
    expect(loanRequestSchema.safeParse({ ...ok, tenureMonths: 0 }).success).toBe(false);
    expect(loanRequestSchema.safeParse({ ...ok, tenureMonths: 7 }).success).toBe(false);
    expect(loanRequestSchema.safeParse({ ...ok, tenureMonths: 6 }).success).toBe(true);
  });
  it("PAN, Aadhaar, VPA formats", () => {
    expect(panSchema.safeParse("ABCDE1234F").success).toBe(true);
    expect(panSchema.safeParse("abcde1234f").success).toBe(true);
    expect(panSchema.safeParse("ABCD1234F").success).toBe(false);
    expect(aadhaarSchema.safeParse("234567890123").success).toBe(true);
    expect(aadhaarSchema.safeParse("12345").success).toBe(false);
    expect(vpaSchema.safeParse("anadi@upi").success).toBe(true);
    expect(vpaSchema.safeParse("no-at-sign").success).toBe(false);
  });
  it("masks identifiers to the last 4", () => {
    expect(maskId("234567890123")).toBe("XXXXXXXX0123");
    expect(maskId("ABCDE1234F")).toBe("XXXXXX234F");
  });
  it("platform fee 1.5% default within 1-2.5%", () => {
    expect(platformFee(rupees(10000))).toBe(rupees(150));
    expect(platformFee(rupees(10000), 2.5)).toBe(rupees(250));
    expect(LIMITS.platformFeeMinPct).toBe(1);
    expect(LIMITS.platformFeeMaxPct).toBe(2.5);
  });
});

describe("late penalties", () => {
  it("flat", () => expect(latePenalty(rupees(2000), { type: "flat", amount: rupees(100) })).toBe(rupees(100)));
  it("percent of instalment", () => expect(latePenalty(rupees(2000), { type: "pct", pct: 2 })).toBe(rupees(40)));
  it("never negative", () => expect(latePenalty(rupees(2000), { type: "flat", amount: -5 })).toBe(0));
});

describe("risk score", () => {
  const base = {
    onTimeInstalments: 6, lateInstalments: 0, defaults: 0, tenureDays: 180,
    approvalRatio: 1, outstanding: 0, totalContributed: rupees(5000), verified: true,
  };
  it("a perfect record scores 100 / low risk", () => {
    const r = computeRiskScore(base);
    expect(r.score).toBe(100);
    expect(r.band).toBe("low");
  });
  it("shows explainable factors that add up to the score", () => {
    const r = computeRiskScore({ ...base, lateInstalments: 2, tenureDays: 90, outstanding: rupees(4000) });
    expect(r.cap).toBeNull();
    expect(r.factors).toHaveLength(5);
    expect(Math.round(r.factors.reduce((a, f) => a + f.points, 0))).toBe(r.score);
    expect(r.factors.every((f) => f.detail.length > 0)).toBe(true);
  });
  it("a default drops the band", () => {
    const r = computeRiskScore({ ...base, onTimeInstalments: 1, lateInstalments: 2, defaults: 1, approvalRatio: 0.5, outstanding: rupees(9000) });
    expect(r.band).toBe("high");
  });
  it("a default on record caps the score at 49 and says so", () => {
    const r = computeRiskScore({ ...base, defaults: 1 });
    expect(r.score).toBe(49);
    expect(r.band).toBe("high");
    expect(r.cap?.limit).toBe(49);
    expect(r.cap?.reason).toMatch(/default/i);
    expect(computeRiskScore(base).cap).toBeNull();
  });
  it("is 'not enough history' for a brand-new member", () => {
    const r = computeRiskScore({ ...base, onTimeInstalments: 0, tenureDays: 5, approvalRatio: null, totalContributed: 0 });
    expect(r.insufficientHistory).toBe(true);
    expect(r.score).toBeNull();
  });
  it("unverified users lose verification points", () => {
    expect(computeRiskScore({ ...base, verified: false }).score).toBe(85);
  });
});

describe("exposure & nudges", () => {
  it("recommends 35% of the pool, capped by max loan", () => {
    expect(recommendedMaxExposure(rupees(40000), rupees(20000))).toBe(rupees(14000));
    expect(recommendedMaxExposure(rupees(200000), rupees(15000))).toBe(rupees(15000));
    expect(recommendedMaxExposure(0, rupees(15000))).toBe(0);
  });
  it("nudges on over-exposure", () => {
    const n = diversificationNudges({
      pool: rupees(40000), available: rupees(30000), circleMaxLoan: rupees(20000),
      outstandingByBorrower: [], requested: { borrowerId: "a", name: "Asha", amount: rupees(20000) },
    });
    expect(n.some((x) => x.id === "over-exposure")).toBe(true);
  });
  it("nudges on concentration and thin liquidity", () => {
    const n = diversificationNudges({
      pool: rupees(50000), available: rupees(5000), circleMaxLoan: rupees(20000),
      outstandingByBorrower: [
        { borrowerId: "a", name: "Asha", amount: rupees(30000) },
        { borrowerId: "b", name: "Ravi", amount: rupees(5000) },
      ],
    });
    expect(n.map((x) => x.id)).toEqual(expect.arrayContaining(["concentration", "low-liquidity"]));
  });
  it("stays quiet when diversified", () => {
    const n = diversificationNudges({
      pool: rupees(100000), available: rupees(60000), circleMaxLoan: rupees(20000),
      outstandingByBorrower: [
        { borrowerId: "a", name: "A", amount: rupees(10000) },
        { borrowerId: "b", name: "B", amount: rupees(10000) },
        { borrowerId: "c", name: "C", amount: rupees(10000) },
      ],
    });
    expect(n).toEqual([]);
  });
});

describe("risk-sharing on default", () => {
  it("shares the loss in proportion to what each lender funded", () => {
    const s = shareLoss(rupees(6000), [
      { lenderId: "a", amount: rupees(6000) },
      { lenderId: "b", amount: rupees(3000) },
      { lenderId: "c", amount: rupees(3000) },
    ]);
    expect(s.map((x) => x.loss)).toEqual([rupees(3000), rupees(1500), rupees(1500)]);
    expect(s.reduce((a, b) => a + b.loss, 0)).toBe(rupees(6000));
  });
  it("shares always add up exactly", () => {
    const s = shareLoss(10001, [{ lenderId: "a", amount: 3 }, { lenderId: "b", amount: 3 }, { lenderId: "c", amount: 3 }]);
    expect(s.reduce((a, b) => a + b.loss, 0)).toBe(10001);
  });
  it("allocates lenders proportionally to available capacity", () => {
    const a = allocateLenders(rupees(10000), [
      { lenderId: "a", available: rupees(8000) },
      { lenderId: "b", available: rupees(2000) },
    ]);
    expect(a).toEqual([{ lenderId: "a", amount: rupees(8000) }, { lenderId: "b", amount: rupees(2000) }]);
  });
  it("refuses when capacity is short", () => {
    expect(() => allocateLenders(rupees(10000), [{ lenderId: "a", available: rupees(5000) }])).toThrow();
  });
});

describe("ledger reconciliation", () => {
  const e = (type: LedgerLike["type"], amount: number, extra: Partial<LedgerLike> = {}): LedgerLike => ({
    type, amount, status: "success", ...extra,
  });
  it("pool = contributions - disbursed + principal + interest + penalties", () => {
    const t = ledgerTotals([
      e("CONTRIBUTION", rupees(20000)),
      e("DISBURSEMENT", rupees(10000)),
      e("REPAY_PRINCIPAL", rupees(2000)),
      e("REPAY_INTEREST", rupees(100)),
      e("PENALTY", rupees(50)),
      e("PLATFORM_FEE", rupees(150)),
    ]);
    expect(t.pool).toBe(rupees(20000 - 10000 + 2000 + 100 + 50));
    expect(t.outstanding).toBe(rupees(8000));
    expect(t.platformFees).toBe(rupees(150));
  });
  it("ignores failed and pending entries", () => {
    const t = ledgerTotals([e("CONTRIBUTION", rupees(1000)), e("CONTRIBUTION", rupees(5000), { status: "failed" }), e("CONTRIBUTION", rupees(700), { status: "pending" })]);
    expect(t.pool).toBe(rupees(1000));
  });
  it("corrects through reversals, never edits", () => {
    const t = ledgerTotals([e("CONTRIBUTION", rupees(3000)), e("REVERSAL", rupees(3000), { reversesType: "CONTRIBUTION" })]);
    expect(t.pool).toBe(0);
  });
  it("a write-off shrinks outstanding but not the pool", () => {
    const t = ledgerTotals([e("CONTRIBUTION", rupees(10000)), e("DISBURSEMENT", rupees(6000)), e("WRITE_OFF", rupees(6000))]);
    expect(t.pool).toBe(rupees(4000));
    expect(t.outstanding).toBe(0);
  });
  it("detects a mismatch", () => {
    const entries = [e("CONTRIBUTION", rupees(1000))];
    expect(reconcilePool(entries, rupees(1000)).ok).toBe(true);
    expect(reconcilePool(entries, rupees(900)).ok).toBe(false);
  });
});

describe("UPI link", () => {
  it("pre-fills payee, amount and note", () => {
    const link = buildUpiLink({ payeeVpa: "ravi@upi", payeeName: "Ravi K", amountPaise: rupees(7500), note: "Loan: fees", reference: "LN-001" });
    expect(link.startsWith("upi://pay?")).toBe(true);
    expect(link).toContain("pa=ravi%40upi");
    expect(link).toContain("am=7500.00");
    expect(link).toContain("cu=INR");
    expect(link).toContain("tn=Loan%3A%20fees");
  });
});
