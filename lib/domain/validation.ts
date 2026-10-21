import { z } from "zod";
import { CITIES, CIRCLE_TYPES, PURPOSES, SEGMENTS } from "@/lib/config";
import { LIMITS, rupees } from "./constants";
import { formatINR } from "./money";

const inr = (p: number) => formatINR(p);

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number");

export const panSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "PAN looks like AAAAA9999A");

export const aadhaarSchema = z
  .string()
  .trim()
  .regex(/^[2-9]\d{11}$/, "Aadhaar is 12 digits");

export const vpaSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{2,}@[a-z][a-z0-9]{1,}$/, "UPI ID looks like name@upi");

export const contributionSchema = z.object({
  amount: z
    .number()
    .int()
    .min(LIMITS.contributionMin, `Minimum contribution is ${inr(LIMITS.contributionMin)}`)
    .max(LIMITS.contributionMax, `Maximum contribution is ${inr(LIMITS.contributionMax)}`),
});

export const circleRulesSchema = z.object({
  maxLoan: z
    .number()
    .int()
    .min(LIMITS.loanMin, `Max loan must be at least ${inr(LIMITS.loanMin)}`)
    .max(LIMITS.loanMax, `Pilot tickets are capped at ${inr(LIMITS.loanMax)}`),
  interestPct: z
    .number()
    .min(LIMITS.interestMinPct, `Interest must be ${LIMITS.interestMinPct}-${LIMITS.interestMaxPct}% p.a.`)
    .max(LIMITS.interestMaxPct, `Interest must be ${LIMITS.interestMinPct}-${LIMITS.interestMaxPct}% p.a.`),
  approvalThresholdPct: z
    .number()
    .int()
    .min(LIMITS.approvalMinPct, `Approval threshold must be ${LIMITS.approvalMinPct}-${LIMITS.approvalMaxPct}%`)
    .max(LIMITS.approvalMaxPct, `Approval threshold must be ${LIMITS.approvalMinPct}-${LIMITS.approvalMaxPct}%`),
  latePenaltyType: z.enum(["flat", "pct"]),
  /** flat: paise per late instalment; pct: percent of the instalment (stored x100? no: plain percent). */
  latePenaltyValue: z.number().min(0).max(rupees(1000)),
  votingWindowHours: z.number().int().min(1).max(168).default(LIMITS.votingWindowHours),
});

export const loanRequestSchema = z.object({
  amount: z
    .number()
    .int()
    .min(LIMITS.loanMin, `Loans start at ${inr(LIMITS.loanMin)} in the pilot`)
    .max(LIMITS.loanMax, `Loans are capped at ${inr(LIMITS.loanMax)} in the pilot`),
  purpose: z.enum(PURPOSES.map((p) => p.id) as [string, ...string[]]),
  tenureMonths: z
    .number()
    .int()
    .min(LIMITS.tenureMin, `Tenure is ${LIMITS.tenureMin}-${LIMITS.tenureMax} months in the pilot`)
    .max(LIMITS.tenureMax, `Tenure is ${LIMITS.tenureMin}-${LIMITS.tenureMax} months in the pilot`),
  interestPct: z
    .number()
    .min(LIMITS.interestMinPct, `Interest must be ${LIMITS.interestMinPct}-${LIMITS.interestMaxPct}% p.a.`)
    .max(LIMITS.interestMaxPct, `Interest must be ${LIMITS.interestMinPct}-${LIMITS.interestMaxPct}% p.a.`),
  note: z.string().trim().max(280).optional(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60),
  city: z.enum(CITIES),
  segment: z.enum(SEGMENTS.map((s) => s.id) as [string, ...string[]]),
  vpa: vpaSchema,
  institution: z.string().trim().max(80).optional(),
});

export const createCircleSchema = z.object({
  type: z.enum(CIRCLE_TYPES.map((t) => t.id) as [string, ...string[]]),
  name: z.string().trim().min(3, "Give your circle a name").max(50),
  description: z.string().trim().max(200).optional(),
  city: z.enum(CITIES),
  rules: circleRulesSchema,
});

export const platformFeePctSchema = z.number().min(LIMITS.platformFeeMinPct).max(LIMITS.platformFeeMaxPct);

/** Platform fee in paise, rounded to the nearest paisa. */
export function platformFee(principal: number, pct: number = LIMITS.platformFeeDefaultPct): number {
  return Math.round((principal * Math.round(pct * 100)) / 10_000);
}

/** Mask an identifier, keeping only the last 4 characters. */
export function maskId(raw: string): string {
  const clean = raw.replace(/\s+/g, "");
  return `${"X".repeat(Math.max(clean.length - 4, 0))}${clean.slice(-4)}`;
}
