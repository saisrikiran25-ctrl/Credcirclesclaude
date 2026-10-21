import { splitEvenly } from "./money";

export interface ScheduleInput {
  principal: number; // paise
  annualRatePct: number; // simple interest, % p.a.
  months: number;
  start: Date; // disbursement date
}

export interface InstalmentPlan {
  number: number; // 1-based
  dueDate: Date;
  principal: number;
  interest: number;
  total: number;
}

/** Add calendar months in UTC, clamping to the last day of the target month (31 Jan + 1m = 28/29 Feb). */
export function addMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(y, m, Math.min(day, lastDay), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()),
  );
}

/**
 * Total simple interest = principal x rate x (months / 12), rounded to the nearest paisa.
 * Computed with integer maths on (rate in basis points) to stay deterministic.
 */
export function totalSimpleInterest(principal: number, annualRatePct: number, months: number): number {
  const bps = Math.round(annualRatePct * 100); // 10% -> 1000 bps
  return Math.round((principal * bps * months) / (10_000 * 12));
}

/**
 * Flat simple-interest schedule. Principal and interest are each split evenly across the
 * instalments (remainder paise go to the earliest instalments), so the schedule always sums
 * exactly to principal + total interest. See DECISIONS.md.
 */
export function buildSchedule(input: ScheduleInput): InstalmentPlan[] {
  const { principal, annualRatePct, months, start } = input;
  if (!Number.isInteger(principal) || principal <= 0) throw new Error("principal must be positive integer paise");
  if (!Number.isInteger(months) || months < 1) throw new Error("months must be an integer >= 1");
  const interestTotal = totalSimpleInterest(principal, annualRatePct, months);
  const principals = splitEvenly(principal, months);
  const interests = splitEvenly(interestTotal, months);
  return principals.map((p, i) => ({
    number: i + 1,
    dueDate: addMonths(start, i + 1),
    principal: p,
    interest: interests[i],
    total: p + interests[i],
  }));
}

export function scheduleTotals(plan: InstalmentPlan[]) {
  const principal = plan.reduce((a, r) => a + r.principal, 0);
  const interest = plan.reduce((a, r) => a + r.interest, 0);
  return { principal, interest, total: principal + interest };
}

/** Headline EMI shown in forms (first instalment amount, the largest). */
export function emiPreview(principal: number, annualRatePct: number, months: number) {
  const plan = buildSchedule({ principal, annualRatePct, months, start: new Date(Date.UTC(2026, 0, 1)) });
  const t = scheduleTotals(plan);
  return { emi: plan[0].total, totalInterest: t.interest, totalRepayable: t.total };
}

export type InstalmentStatus = "paid" | "upcoming" | "due" | "overdue";

export const DUE_SOON_DAYS = 3;

/** Upcoming -> Due (within 3 days of the due date, or on it) -> Overdue (after the due date). */
export function instalmentStatus(dueDate: Date, now: Date, paid: boolean): InstalmentStatus {
  if (paid) return "paid";
  const dueEnd = dueDate.getTime() + 24 * 3600 * 1000; // due through end of the due day
  if (now.getTime() >= dueEnd) return "overdue";
  const dueSoonStart = dueDate.getTime() - DUE_SOON_DAYS * 24 * 3600 * 1000;
  if (now.getTime() >= dueSoonStart) return "due";
  return "upcoming";
}

export interface InstalmentState {
  principal: number;
  interest: number;
  dueDate: Date;
  paid: boolean;
}

/** Outstanding principal = principal of unpaid instalments. */
export function outstandingPrincipal(rows: InstalmentState[]): number {
  return rows.filter((r) => !r.paid).reduce((a, r) => a + r.principal, 0);
}

/**
 * Interest accrued to date = interest of every instalment that is paid or already due
 * (interest is recognised as each instalment falls due). Documented in DECISIONS.md.
 */
export function interestAccrued(rows: InstalmentState[], now: Date): number {
  return rows.filter((r) => r.paid || r.dueDate.getTime() <= now.getTime()).reduce((a, r) => a + r.interest, 0);
}

/**
 * Restructure: re-schedule the REMAINING principal over a new tenure at the loan's rate.
 * Already-recognised interest on unpaid instalments is not compounded. Tenure may extend
 * beyond the pilot cap only through a restructure (max 12 months total from restructure date).
 */
export function restructureSchedule(opts: {
  remainingPrincipal: number;
  annualRatePct: number;
  newMonths: number;
  start: Date;
}): InstalmentPlan[] {
  return buildSchedule({
    principal: opts.remainingPrincipal,
    annualRatePct: opts.annualRatePct,
    months: opts.newMonths,
    start: opts.start,
  });
}
