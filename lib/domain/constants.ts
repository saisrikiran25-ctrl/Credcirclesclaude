/**
 * Product rules from the business description. All money is INTEGER PAISE.
 * Change a rule here and every validator, form hint and test follows.
 */
export const RUPEE = 100;
export const rupees = (n: number): number => Math.round(n * RUPEE);

export const LIMITS = {
  /** Interest policy, % per annum (simple interest). */
  interestMinPct: 8,
  interestMaxPct: 12,
  interestDefaultPct: 10,
  /** Approval threshold, % of eligible members. Default 70. */
  approvalDefaultPct: 70,
  approvalMinPct: 51,
  approvalMaxPct: 100,
  /** Contribution per payment (paise). */
  contributionMin: rupees(500),
  contributionMax: rupees(5000),
  /** Pilot ticket size (paise). */
  loanMin: rupees(5000),
  loanMax: rupees(20000),
  /** Pilot tenor, months. */
  tenureMin: 1,
  tenureMax: 6,
  /** Platform fee, % of principal. */
  platformFeeMinPct: 1,
  platformFeeMaxPct: 2.5,
  platformFeeDefaultPct: 1.5,
  /** Circle Premium, paise per month. */
  premiumMin: rupees(50),
  premiumMax: rupees(200),
  premiumDefault: rupees(99),
  /** Default voting window in hours. */
  votingWindowHours: 48,
  /** Share of the pool one borrower may take (recommended max exposure). */
  maxExposurePctOfPool: 35,
  /** A single borrower above this share of outstanding triggers a nudge. */
  concentrationNudgePct: 50,
  /** Min risk score for a vetted external borrower (unless admin-vetted). */
  externalMinRiskScore: 60,
} as const;

export const MONEY_STAYS_COPY = "Your money stays in your bank account.";
export const RISK_DISCLOSURE = "Lending carries risk of loss. Only lend what you can afford to lose.";
