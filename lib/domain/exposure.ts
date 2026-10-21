import { LIMITS } from "./constants";

/** Recommended max exposure to ONE borrower: a share of the pool, never above the circle's max loan. */
export function recommendedMaxExposure(pool: number, circleMaxLoan: number): number {
  const byPool = Math.floor((pool * LIMITS.maxExposurePctOfPool) / 100);
  return Math.max(0, Math.min(byPool, circleMaxLoan));
}

export interface Nudge {
  id: string;
  severity: "info" | "warn";
  title: string;
  body: string;
}

export interface NudgeInput {
  pool: number; // logical pool (lendable capacity incl. money out)
  available: number; // pool not currently lent out
  outstandingByBorrower: { borrowerId: string; name: string; amount: number }[];
  /** Amount being requested right now (optional). */
  requested?: { borrowerId: string; name: string; amount: number };
  circleMaxLoan: number;
}

/** Diversification nudges: concentration, over-exposure on a request, thin liquidity. */
export function diversificationNudges(i: NudgeInput): Nudge[] {
  const nudges: Nudge[] = [];
  const recMax = recommendedMaxExposure(i.pool, i.circleMaxLoan);
  const totalOut = i.outstandingByBorrower.reduce((a, b) => a + b.amount, 0);

  if (i.requested) {
    const existing = i.outstandingByBorrower.find((b) => b.borrowerId === i.requested!.borrowerId)?.amount ?? 0;
    const after = existing + i.requested.amount;
    if (after > recMax) {
      nudges.push({
        id: "over-exposure",
        severity: "warn",
        title: "Above recommended exposure",
        body: `${i.requested.name} would owe the circle more than the recommended single-borrower limit (${LIMITS.maxExposurePctOfPool}% of the pool). Consider a smaller amount or splitting across more lenders.`,
      });
    }
  }

  if (totalOut > 0) {
    const top = [...i.outstandingByBorrower].sort((a, b) => b.amount - a.amount)[0];
    const share = (top.amount / totalOut) * 100;
    if (i.outstandingByBorrower.length > 1 || share === 100) {
      if (share > LIMITS.concentrationNudgePct) {
        nudges.push({
          id: "concentration",
          severity: "warn",
          title: "Lending is concentrated",
          body: `${Math.round(share)}% of money out is with ${top.name}. Spreading across more borrowers lowers the damage from any one default.`,
        });
      }
    }
  }

  if (i.pool > 0 && i.available / i.pool < 0.2) {
    nudges.push({
      id: "low-liquidity",
      severity: "info",
      title: "Liquidity is thin",
      body: "Less than 20% of the pool is free to lend. New requests may have to wait for repayments.",
    });
  }
  return nudges;
}
