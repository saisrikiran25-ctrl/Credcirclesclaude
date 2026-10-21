export type RiskBand = "low" | "medium" | "high";

export interface RiskInput {
  onTimeInstalments: number;
  lateInstalments: number;
  defaults: number;
  tenureDays: number; // time on the platform
  /** Share of this member's past loan requests the circle approved (0..1), null when none. */
  approvalRatio: number | null;
  outstanding: number; // paise currently owed
  totalContributed: number; // paise contributed to circles
  verified: boolean;
}

export interface RiskFactor {
  key: "repayment" | "tenure" | "approval" | "exposure" | "verification";
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface RiskResult {
  /** null = "Not enough history". */
  score: number | null;
  band: RiskBand | null;
  insufficientHistory: boolean;
  factors: RiskFactor[];
  /** Set when a rule overrides the additive score (shown to the user, never hidden). */
  cap: { limit: number; reason: string } | null;
}

/** A default on record limits the score, so one good factor cannot mask a lender loss. */
export const DEFAULT_SCORE_CAP = 49;

export const RISK_WEIGHTS = { repayment: 35, tenure: 15, approval: 15, exposure: 20, verification: 15 } as const;

export const bandFor = (score: number): RiskBand => (score >= 75 ? "low" : score >= 50 ? "medium" : "high");

export const BAND_LABEL: Record<RiskBand, string> = { low: "Low risk", medium: "Medium risk", high: "High risk" };

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Transparent, additive risk score out of 100. Every factor is returned with its points and a
 * plain-English detail, so the UI can show exactly why a score is what it is. Pure function.
 *
 *  Repayment history  35  on-time share, minus 20 per default (neutral half-marks with no history yet)
 *  Tenure             15  linear to 180 days on the platform
 *  Circle approval    15  share of past requests the circle approved (neutral with none)
 *  Exposure           20  outstanding vs contributed: full marks at 0x, zero at 2x or more
 *  Verification       15  eKYC verified
 *  Cap                    any default on record limits the score to 49 (High risk)
 *
 * "Not enough history" = no repayment record at all and under 30 days on the platform.
 */
export function computeRiskScore(i: RiskInput): RiskResult {
  const settled = i.onTimeInstalments + i.lateInstalments;
  const noRecord = settled === 0 && i.defaults === 0;

  // Repayment
  let repayPts: number;
  let repayDetail: string;
  if (noRecord) {
    repayPts = RISK_WEIGHTS.repayment / 2;
    repayDetail = "No repayments yet, so this factor is neutral";
  } else {
    const ratio = settled === 0 ? 0 : i.onTimeInstalments / settled;
    repayPts = clamp(RISK_WEIGHTS.repayment * ratio - 20 * i.defaults, 0, RISK_WEIGHTS.repayment);
    repayDetail = `${i.onTimeInstalments} of ${settled} instalments on time${i.defaults ? `, ${i.defaults} default(s)` : ""}`;
  }

  // Tenure
  const tenurePts = RISK_WEIGHTS.tenure * clamp(i.tenureDays / 180, 0, 1);
  const tenureDetail = `${i.tenureDays} days on the platform (full marks at 180)`;

  // Approval ratio
  const approvalPts =
    i.approvalRatio === null ? RISK_WEIGHTS.approval / 2 : RISK_WEIGHTS.approval * clamp(i.approvalRatio, 0, 1);
  const approvalDetail =
    i.approvalRatio === null
      ? "No past requests, so this factor is neutral"
      : `Circles approved ${Math.round(i.approvalRatio * 100)}% of past requests`;

  // Exposure: outstanding vs contribution
  let exposurePts: number;
  let exposureDetail: string;
  if (i.totalContributed <= 0) {
    exposurePts = i.outstanding === 0 ? RISK_WEIGHTS.exposure / 2 : 0;
    exposureDetail =
      i.outstanding === 0 ? "No contributions on record, so this factor is neutral" : "Owes money with no contributions on record";
  } else {
    const ratio = i.outstanding / i.totalContributed;
    exposurePts = RISK_WEIGHTS.exposure * clamp(1 - ratio / 2, 0, 1);
    exposureDetail = `Owes ${r1(ratio)}x what they have contributed (zero marks at 2x)`;
  }

  // Verification
  const verifyPts = i.verified ? RISK_WEIGHTS.verification : 0;
  const verifyDetail = i.verified ? "eKYC verified" : "eKYC not completed";

  const factors: RiskFactor[] = [
    { key: "repayment", label: "Repayment history", points: r1(repayPts), max: RISK_WEIGHTS.repayment, detail: repayDetail },
    { key: "tenure", label: "Time on platform", points: r1(tenurePts), max: RISK_WEIGHTS.tenure, detail: tenureDetail },
    { key: "approval", label: "Circle approval ratio", points: r1(approvalPts), max: RISK_WEIGHTS.approval, detail: approvalDetail },
    { key: "exposure", label: "Outstanding vs contribution", points: r1(exposurePts), max: RISK_WEIGHTS.exposure, detail: exposureDetail },
    { key: "verification", label: "Verification", points: r1(verifyPts), max: RISK_WEIGHTS.verification, detail: verifyDetail },
  ];

  const insufficientHistory = noRecord && i.tenureDays < 30;
  if (insufficientHistory) return { score: null, band: null, insufficientHistory: true, factors, cap: null };

  let score = Math.round(factors.reduce((a, f) => a + f.points, 0));
  let cap: RiskResult["cap"] = null;
  if (i.defaults > 0 && score > DEFAULT_SCORE_CAP) {
    score = DEFAULT_SCORE_CAP;
    cap = { limit: DEFAULT_SCORE_CAP, reason: "A default on record limits the score to High risk until it is resolved." };
  }
  return { score, band: bandFor(score), insufficientHistory: false, factors, cap };
}
