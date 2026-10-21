import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { schema } from "@/lib/db";
import { annualisedYieldPct, ledgerTotals, type LedgerLike, type LedgerTotals } from "@/lib/domain/ledger";
import { splitProportionally } from "@/lib/domain/money";
import { computeRiskScore, type RiskResult } from "@/lib/domain/risk";
import { instalmentStatus } from "@/lib/domain/emi";
import { activeMemberIds, getUser, type DbLike } from "./shared";

const { ledgerEntries, loans, instalments, loanLenders, repayments, contributions, users } = schema;

const DAY = 24 * 3600 * 1000;
/** Paid on or before the end of the due day counts as on time. */
export const onTimeCutoff = (due: Date) => due.getTime() + DAY;

export function circleLedger(db: DbLike, circleId: string) {
  return db.select().from(ledgerEntries).where(eq(ledgerEntries.circleId, circleId)).orderBy(asc(ledgerEntries.createdAt)).all();
}

export const toLedgerLike = (rows: ReturnType<typeof circleLedger>): LedgerLike[] =>
  rows.map((r) => ({
    type: r.type as LedgerLike["type"],
    amount: r.amount,
    status: r.status as LedgerLike["status"],
    reversesType: (r.reversesType as LedgerLike["type"] | null) ?? null,
  }));

export function circleTotals(db: DbLike, circleId: string): LedgerTotals {
  return ledgerTotals(toLedgerLike(circleLedger(db, circleId)));
}

/** Unpaid principal on a loan's active schedule. */
export function loanOutstanding(db: DbLike, loanId: string): number {
  return db
    .select()
    .from(instalments)
    .where(and(eq(instalments.loanId, loanId), eq(instalments.state, "active")))
    .all()
    .filter((i) => !i.paidAt)
    .reduce((a, i) => a + i.principal, 0);
}

export function memberContributionTotals(db: DbLike, circleId: string): Map<string, number> {
  const rows = db.select().from(contributions).where(eq(contributions.circleId, circleId)).all();
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.userId, (m.get(r.userId) ?? 0) + r.amount);
  return m;
}

/**
 * Per-member lending capacity = contributed + earnings - principal currently lent - loss share.
 * Used to split a loan across lenders. Sums to the circle pool (within a few paise of rounding).
 */
export function memberCapacity(db: DbLike, circleId: string): Map<string, number> {
  const cap = new Map<string, number>();
  for (const [uid, amt] of memberContributionTotals(db, circleId)) cap.set(uid, amt);
  for (const uid of activeMemberIds(db, circleId)) if (!cap.has(uid)) cap.set(uid, 0);

  const circleLoans = db.select().from(loans).where(eq(loans.circleId, circleId)).all()
    .filter((l) => l.status === "repaying" || l.status === "closed" || l.status === "defaulted");
  for (const loan of circleLoans) {
    const shares = db.select().from(loanLenders).where(and(eq(loanLenders.loanId, loan.id), eq(loanLenders.status, "paid"))).all();
    if (shares.length === 0) continue;
    const reps = db.select().from(repayments).where(eq(repayments.loanId, loan.id)).all();
    const earned = reps.reduce((a, r) => a + r.interest + r.penalty, 0);
    const principalBack = reps.reduce((a, r) => a + r.principal, 0);
    const weights = shares.map((s) => s.amount);
    const earnShares = splitProportionally(earned, weights);
    const backShares = splitProportionally(principalBack, weights);
    shares.forEach((s, i) => {
      // principal lent leaves capacity; what has come back and the interest earned return to it
      cap.set(s.lenderId, (cap.get(s.lenderId) ?? 0) - s.amount + backShares[i] + earnShares[i]);
    });
    // A defaulted loan's unpaid principal is a loss: it simply never comes back (no add-back).
  }
  return cap;
}

/** Plain risk inputs for a user, then the explainable score. */
export function riskForUser(db: DbLike, userId: string, now: Date): RiskResult {
  const user = getUser(db, userId);
  const myLoans = db.select().from(loans).where(eq(loans.borrowerId, userId)).all();
  const loanIds = myLoans.map((l) => l.id);
  const insts = loanIds.length
    ? db.select().from(instalments).where(and(inArray(instalments.loanId, loanIds), eq(instalments.state, "active"))).all()
    : [];
  let onTime = 0;
  let late = 0;
  let outstanding = 0;
  for (const i of insts) {
    if (i.paidAt) {
      if (i.paidAt.getTime() <= onTimeCutoff(i.dueDate)) onTime += 1;
      else late += 1;
    } else if (now.getTime() >= onTimeCutoff(i.dueDate)) late += 1;
  }
  for (const l of myLoans) if (l.status === "repaying") outstanding += loanOutstanding(db, l.id);
  const decided = myLoans.filter((l) => l.status !== "voting");
  const approvalRatio = decided.length === 0 ? null : decided.filter((l) => l.status !== "rejected").length / decided.length;
  const totalContributed = db.select().from(contributions).where(eq(contributions.userId, userId)).all().reduce((a, c) => a + c.amount, 0);
  return computeRiskScore({
    onTimeInstalments: onTime,
    lateInstalments: late,
    defaults: myLoans.filter((l) => l.status === "defaulted").length,
    tenureDays: Math.max(0, Math.floor((now.getTime() - user.createdAt.getTime()) / DAY)),
    approvalRatio,
    outstanding,
    totalContributed,
    verified: user.kycStatus === "verified",
  });
}

export interface CircleStats {
  totals: LedgerTotals;
  overdueAmount: number;
  overdueCount: number;
  onTimeRate: number | null; // 0..100
  yieldPct: number;
  exposureByBorrower: { borrowerId: string; name: string; amount: number }[];
  perMember: { userId: string; contributed: number }[];
  memberCount: number;
  activeLoans: number;
}

export function circleStats(db: DbLike, circleId: string, now: Date): CircleStats {
  const totals = circleTotals(db, circleId);
  const circleLoans = db.select().from(loans).where(eq(loans.circleId, circleId)).all();
  const repaying = circleLoans.filter((l) => l.status === "repaying");
  let overdueAmount = 0;
  let overdueCount = 0;
  let onTime = 0;
  let late = 0;
  const byBorrower = new Map<string, number>();
  for (const l of circleLoans.filter((x) => ["repaying", "closed", "defaulted"].includes(x.status))) {
    const insts = db.select().from(instalments).where(and(eq(instalments.loanId, l.id), eq(instalments.state, "active"))).all();
    for (const i of insts) {
      if (i.paidAt) {
        if (i.paidAt.getTime() <= onTimeCutoff(i.dueDate)) onTime += 1; else late += 1;
      } else if (l.status === "repaying") {
        if (instalmentStatus(i.dueDate, now, false) === "overdue") {
          overdueAmount += i.principal + i.interest + i.penalty;
          overdueCount += 1;
          late += 1;
        }
        byBorrower.set(l.borrowerId, (byBorrower.get(l.borrowerId) ?? 0) + i.principal);
      }
    }
  }
  const names = new Map(db.select().from(users).all().map((u) => [u.id, u.name]));
  const circle = db.select().from(schema.circles).where(eq(schema.circles.id, circleId)).get();
  const daysActive = circle ? Math.max(1, Math.floor((now.getTime() - circle.createdAt.getTime()) / DAY)) : 1;
  const perMemberMap = memberContributionTotals(db, circleId);
  return {
    totals,
    overdueAmount,
    overdueCount,
    onTimeRate: onTime + late === 0 ? null : (onTime / (onTime + late)) * 100,
    yieldPct: annualisedYieldPct(totals.interestEarned + totals.penalties, Math.max(totals.contributions, 1), daysActive),
    exposureByBorrower: [...byBorrower].map(([borrowerId, amount]) => ({ borrowerId, name: names.get(borrowerId) ?? "Member", amount })).sort((a, b) => b.amount - a.amount),
    perMember: activeMemberIds(db, circleId).map((userId) => ({ userId, contributed: perMemberMap.get(userId) ?? 0 })),
    memberCount: activeMemberIds(db, circleId).length,
    activeLoans: repaying.length,
  };
}

/** Pool vs outstanding at evenly spaced points, from the ledger. Powers the performance chart. */
export function portfolioSeries(db: DbLike, circleId: string, now: Date, points = 12) {
  const rows = db.select().from(ledgerEntries).where(eq(ledgerEntries.circleId, circleId)).orderBy(asc(ledgerEntries.createdAt)).all();
  if (rows.length === 0) return [] as { date: string; pool: number; outstanding: number }[];
  const start = rows[0].createdAt.getTime();
  const end = Math.max(now.getTime(), start + DAY);
  const out: { date: string; pool: number; outstanding: number }[] = [];
  for (let k = 0; k < points; k++) {
    const t = start + ((end - start) * k) / (points - 1);
    const upTo = rows.filter((r) => r.createdAt.getTime() <= t);
    const tot = ledgerTotals(toLedgerLike(upTo));
    out.push({
      date: new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      pool: tot.pool + tot.outstanding, // total capital in the circle (available + lent)
      outstanding: tot.outstanding,
    });
  }
  return out;
}

export function recentLedger(db: DbLike, circleId: string, limit = 50) {
  return db.select().from(ledgerEntries).where(eq(ledgerEntries.circleId, circleId)).orderBy(desc(ledgerEntries.createdAt)).limit(limit).all();
}
