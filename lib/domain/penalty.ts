export type PenaltyPolicy = { type: "flat"; amount: number } | { type: "pct"; pct: number };

/**
 * One penalty per late instalment (not per day), per the circle's rules.
 * flat: fixed paise. pct: percent of the instalment total, rounded to the nearest paisa.
 */
export function latePenalty(instalmentTotal: number, policy: PenaltyPolicy): number {
  if (policy.type === "flat") return Math.max(0, Math.round(policy.amount));
  return Math.max(0, Math.round((instalmentTotal * Math.round(policy.pct * 100)) / 10_000));
}
