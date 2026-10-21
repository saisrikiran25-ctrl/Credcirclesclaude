import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { schema } from "@/lib/db";
import type { LedgerStatus, LedgerType } from "@/lib/domain/ledger";

const { users, memberships, notifications, ledgerEntries } = schema;

/** A Drizzle database or an open transaction on it. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbLike = Db | Tx;

export type UserRow = typeof users.$inferSelect;
export type CircleRow = typeof schema.circles.$inferSelect;
export type LoanRow = typeof schema.loans.$inferSelect;
export type InstalmentRow = typeof schema.instalments.$inferSelect;

/** Expected, user-facing failure (shown in the UI). Anything else is a bug. */
export class AppError extends Error {
  constructor(message: string, public code: "forbidden" | "invalid" | "not_found" | "conflict" = "invalid") {
    super(message);
    this.name = "AppError";
  }
}

export const newId = () => randomUUID();

let refSeq = 0;
/** Human-friendly unique reference, e.g. LG-M3K9X2-04. */
export function newRef(prefix: string): string {
  refSeq = (refSeq + 1) % 100;
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}${refSeq.toString().padStart(2, "0")}`;
}

export function getUser(db: DbLike, userId: string): UserRow {
  const u = db.select().from(users).where(eq(users.id, userId)).get();
  if (!u) throw new AppError("User not found", "not_found");
  return u;
}

export function requireVerified(user: UserRow) {
  if (user.kycStatus !== "verified") {
    throw new AppError("Complete eKYC verification before joining circles, lending or borrowing.", "forbidden");
  }
}

export function getMembership(db: DbLike, circleId: string, userId: string) {
  return db
    .select()
    .from(memberships)
    .where(and(eq(memberships.circleId, circleId), eq(memberships.userId, userId), eq(memberships.status, "active")))
    .get();
}

export function requireMember(db: DbLike, circleId: string, userId: string) {
  const m = getMembership(db, circleId, userId);
  if (!m) throw new AppError("Only circle members can see or do this.", "forbidden");
  return m;
}

export function requireAdmin(db: DbLike, circleId: string, userId: string) {
  const m = requireMember(db, circleId, userId);
  if (m.role !== "admin") throw new AppError("Only the circle admin can do this.", "forbidden");
  return m;
}

export function notify(
  db: DbLike,
  userId: string,
  n: { kind: string; title: string; body: string; href?: string },
  now: Date,
) {
  db.insert(notifications)
    .values({ id: newId(), userId, kind: n.kind, title: n.title, body: n.body, href: n.href ?? null, readAt: null, createdAt: now })
    .run();
}

export function activeMemberIds(db: DbLike, circleId: string): string[] {
  return db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.circleId, circleId), eq(memberships.status, "active")))
    .all()
    .map((r) => r.userId);
}

export interface LedgerInput {
  circleId: string;
  loanId?: string | null;
  actorId: string;
  type: LedgerType;
  amount: number;
  status?: LedgerStatus;
  reversesType?: LedgerType | null;
  reversesRef?: string | null;
  memo?: string;
  at: Date;
}

/** The ONLY write path into the ledger: append. There is deliberately no update or delete. */
export function appendLedger(db: DbLike, e: LedgerInput): string {
  const ref = newRef("LG");
  db.insert(ledgerEntries)
    .values({
      id: newId(),
      ref,
      circleId: e.circleId,
      loanId: e.loanId ?? null,
      actorId: e.actorId,
      type: e.type,
      amount: e.amount,
      status: e.status ?? "success",
      reversesType: e.reversesType ?? null,
      reversesRef: e.reversesRef ?? null,
      memo: e.memo ?? null,
      createdAt: e.at,
    })
    .run();
  return ref;
}
