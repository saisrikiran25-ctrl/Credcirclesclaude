export type LedgerType =
  | "CONTRIBUTION"
  | "DISBURSEMENT"
  | "REPAY_PRINCIPAL"
  | "REPAY_INTEREST"
  | "PENALTY"
  | "PLATFORM_FEE"
  | "WRITE_OFF"
  | "REVERSAL";

export type LedgerStatus = "success" | "pending" | "failed";

export interface LedgerLike {
  type: LedgerType;
  amount: number; // paise, always positive
  status: LedgerStatus;
  /** Only for REVERSAL: the type of the entry being corrected. */
  reversesType?: LedgerType | null;
}

export interface LedgerTotals {
  contributions: number;
  disbursed: number;
  principalRepaid: number;
  interestEarned: number;
  penalties: number;
  platformFees: number;
  writtenOff: number;
  /** Logical pool = contributions - disbursed + principal repaid + interest + penalties. */
  pool: number;
  /** Money currently lent out = disbursed - principal repaid - written off. */
  outstanding: number;
  /** Lendable now = pool (money still "in the circle" and not lent). */
  available: number;
}

/** Sign applied to each component. A REVERSAL flips the sign of the type it reverses. */
function bucket(type: LedgerType, sign: 1 | -1, amount: number, t: LedgerTotals) {
  const v = sign * amount;
  switch (type) {
    case "CONTRIBUTION": t.contributions += v; break;
    case "DISBURSEMENT": t.disbursed += v; break;
    case "REPAY_PRINCIPAL": t.principalRepaid += v; break;
    case "REPAY_INTEREST": t.interestEarned += v; break;
    case "PENALTY": t.penalties += v; break;
    case "PLATFORM_FEE": t.platformFees += v; break;
    case "WRITE_OFF": t.writtenOff += v; break;
    case "REVERSAL": break;
  }
}

/**
 * Pool rule (documented in DECISIONS.md):
 *   pool = contributions - disbursed principal + principal repaid + interest + penalties
 * Platform fees are paid by the borrower to the platform, never through the pool. A write-off
 * records a loss: it shrinks "outstanding" but does not touch the pool (the principal never came back).
 * Only `success` entries count. Corrections are REVERSAL entries; the ledger is never edited.
 */
export function ledgerTotals(entries: LedgerLike[]): LedgerTotals {
  const t: LedgerTotals = {
    contributions: 0, disbursed: 0, principalRepaid: 0, interestEarned: 0, penalties: 0,
    platformFees: 0, writtenOff: 0, pool: 0, outstanding: 0, available: 0,
  };
  for (const e of entries) {
    if (e.status !== "success") continue;
    if (e.type === "REVERSAL") {
      if (e.reversesType) bucket(e.reversesType, -1, e.amount, t);
    } else {
      bucket(e.type, 1, e.amount, t);
    }
  }
  t.pool = t.contributions - t.disbursed + t.principalRepaid + t.interestEarned + t.penalties;
  t.outstanding = t.disbursed - t.principalRepaid - t.writtenOff;
  t.available = t.pool;
  return t;
}

export function reconcilePool(entries: LedgerLike[], reportedPool: number) {
  const expected = ledgerTotals(entries).pool;
  return { ok: expected === reportedPool, expected, reported: reportedPool, diff: reportedPool - expected };
}

/** Annualised yield of a circle: interest earned / average capital / years. Returns a percent. */
export function annualisedYieldPct(interestEarned: number, capital: number, daysActive: number): number {
  if (capital <= 0 || daysActive <= 0) return 0;
  return (interestEarned / capital) * (365 / daysActive) * 100;
}
