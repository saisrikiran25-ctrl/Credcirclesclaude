import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { schema } from "@/lib/db";
import { instalmentStatus } from "@/lib/domain/emi";
import { splitProportionally } from "@/lib/domain/money";
import { shareLoss } from "@/lib/domain/riskSharing";
import { activeMemberIds, type DbLike } from "./shared";
import { loanOutstanding } from "./stats";

const { loans, loanLenders, instalments, repayments, circles, memberships, notifications, votes, users, contributions } = schema;

export interface DueItem {
  loanId: string;
  circleName: string;
  number: number;
  dueDate: Date;
  amount: number;
  status: "upcoming" | "due" | "overdue";
}

/** "My position": total lent, total borrowed, net, upcoming dues, earnings (and any loss share). */
export function myPosition(db: DbLike, userId: string, now: Date) {
  // As lender
  const shares = db
    .select({ s: loanLenders, l: loans })
    .from(loanLenders)
    .innerJoin(loans, eq(loans.id, loanLenders.loanId))
    .where(and(eq(loanLenders.lenderId, userId), eq(loanLenders.status, "paid")))
    .all();
  let totalLent = 0;
  let lentOutstanding = 0;
  let earnings = 0;
  let lossShare = 0;
  for (const { s, l } of shares) {
    totalLent += s.amount;
    const all = db.select().from(loanLenders).where(and(eq(loanLenders.loanId, l.id), eq(loanLenders.status, "paid"))).all();
    const weights = all.map((x) => x.amount);
    const idx = all.findIndex((x) => x.id === s.id);
    const reps = db.select().from(repayments).where(eq(repayments.loanId, l.id)).all();
    earnings += splitProportionally(reps.reduce((a, r) => a + r.interest + r.penalty, 0), weights)[idx] ?? 0;
    if (l.status === "repaying") {
      const out = loanOutstanding(db, l.id);
      lentOutstanding += splitProportionally(out, weights)[idx] ?? 0;
    } else if (l.status === "defaulted") {
      const unpaid = db.select().from(instalments).where(and(eq(instalments.loanId, l.id), eq(instalments.state, "active"))).all().filter((i) => !i.paidAt).reduce((a, i) => a + i.principal, 0);
      lossShare += shareLoss(unpaid, all.map((x) => ({ lenderId: x.lenderId, amount: x.amount }))).find((x) => x.lenderId === userId)?.loss ?? 0;
    }
  }
  // As borrower
  const mine = db.select().from(loans).where(eq(loans.borrowerId, userId)).all()
    .filter((l) => ["repaying", "closed", "defaulted"].includes(l.status));
  let totalBorrowed = 0;
  let borrowedOutstanding = 0;
  const dues: DueItem[] = [];
  for (const l of mine) {
    totalBorrowed += l.amount;
    if (l.status !== "repaying") continue;
    const circle = db.select().from(circles).where(eq(circles.id, l.circleId)).get();
    const insts = db.select().from(instalments).where(and(eq(instalments.loanId, l.id), eq(instalments.state, "active"))).orderBy(asc(instalments.number)).all().filter((i) => !i.paidAt);
    borrowedOutstanding += insts.reduce((a, i) => a + i.principal, 0);
    for (const i of insts.slice(0, 2)) {
      const st = instalmentStatus(i.dueDate, now, false);
      if (st === "paid") continue;
      dues.push({ loanId: l.id, circleName: circle?.name ?? "Circle", number: i.number, dueDate: i.dueDate, amount: i.principal + i.interest + i.penalty, status: st });
    }
  }
  dues.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return {
    totalLent, lentOutstanding, totalBorrowed, borrowedOutstanding,
    net: lentOutstanding - borrowedOutstanding,
    earnings, lossShare, dues,
  };
}

export function myCircles(db: DbLike, userId: string) {
  return db
    .select({ c: circles, m: memberships })
    .from(memberships)
    .innerJoin(circles, eq(circles.id, memberships.circleId))
    .where(and(eq(memberships.userId, userId), eq(memberships.status, "active")))
    .orderBy(asc(circles.createdAt))
    .all()
    .map(({ c, m }) => ({ ...c, role: m.role, memberCount: activeMemberIds(db, c.id).length }));
}

/** Votes the user still owes: open requests in their circles, not their own, not yet voted. */
export function pendingVotes(db: DbLike, userId: string, now: Date) {
  const cids = myCircles(db, userId).map((c) => c.id);
  if (cids.length === 0) return [];
  const open = db.select().from(loans).where(and(inArray(loans.circleId, cids), eq(loans.status, "voting"))).orderBy(desc(loans.createdAt)).all()
    .filter((l) => l.borrowerId !== userId && l.votingEndsAt.getTime() > now.getTime());
  const voted = new Set(db.select().from(votes).where(eq(votes.userId, userId)).all().map((v) => v.loanId));
  const names = new Map(db.select().from(users).all().map((u) => [u.id, u.name]));
  const cn = new Map(db.select().from(circles).all().map((c) => [c.id, c.name]));
  return open.filter((l) => !voted.has(l.id)).map((l) => ({ loan: l, borrowerName: names.get(l.borrowerId) ?? "Member", circleName: cn.get(l.circleId) ?? "Circle" }));
}

export function myLoans(db: DbLike, userId: string) {
  const cids = myCircles(db, userId).map((c) => c.id);
  const asBorrower = db.select().from(loans).where(eq(loans.borrowerId, userId)).orderBy(desc(loans.createdAt)).all();
  const inCircles = cids.length ? db.select().from(loans).where(inArray(loans.circleId, cids)).orderBy(desc(loans.createdAt)).all() : [];
  const byId = new Map([...inCircles, ...asBorrower].map((l) => [l.id, l]));
  const names = new Map(db.select().from(users).all().map((u) => [u.id, u.name]));
  const cn = new Map(db.select().from(circles).all().map((c) => [c.id, c.name]));
  const lenderOn = new Set(db.select().from(loanLenders).where(eq(loanLenders.lenderId, userId)).all().map((x) => x.loanId));
  return [...byId.values()]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((l) => ({ loan: l, borrowerName: names.get(l.borrowerId) ?? "Member", circleName: cn.get(l.circleId) ?? "Circle", mine: l.borrowerId === userId, lending: lenderOn.has(l.id) }));
}

export function userNotifications(db: DbLike, userId: string, limit = 60) {
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit).all();
}

export function unreadCount(db: DbLike, userId: string): number {
  return db.select().from(notifications).where(eq(notifications.userId, userId)).all().filter((n) => !n.readAt).length;
}

export function userContributionTotal(db: DbLike, userId: string): number {
  return db.select().from(contributions).where(eq(contributions.userId, userId)).all().reduce((a, c) => a + c.amount, 0);
}
