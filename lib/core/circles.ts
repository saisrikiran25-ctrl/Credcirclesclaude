import { and, eq, sql } from "drizzle-orm";
import { schema } from "@/lib/db";
import type { Db } from "@/lib/db";
import { LIMITS } from "@/lib/domain/constants";
import { circleRulesSchema, contributionSchema, createCircleSchema } from "@/lib/domain/validation";
import { formatINR } from "@/lib/domain/money";
import { services } from "@/lib/services/simulated";
import {
  AppError, activeMemberIds, appendLedger, getMembership, getUser, newId, notify, requireAdmin, requireMember, requireVerified,
  type DbLike,
} from "./shared";

const { circles, memberships, invites, contributions, loans, loanLenders, premiumSubscriptions } = schema;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function inviteCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

function firstIssue(e: { issues: { message: string }[] }) {
  return e.issues[0]?.message ?? "Please check the form";
}

export function createCircle(db: Db, userId: string, raw: unknown, now: Date) {
  const user = getUser(db, userId);
  requireVerified(user);
  const parsed = createCircleSchema.safeParse(raw);
  if (!parsed.success) throw new AppError(firstIssue(parsed.error));
  const v = parsed.data;
  return db.transaction((tx) => {
    const id = newId();
    tx.insert(circles).values({
      id,
      name: v.name,
      description: v.description ?? null,
      type: v.type,
      city: v.city,
      creatorId: userId,
      maxLoan: v.rules.maxLoan,
      interestPct: v.rules.interestPct,
      approvalThresholdPct: v.rules.approvalThresholdPct,
      latePenaltyType: v.rules.latePenaltyType,
      latePenaltyValue: v.rules.latePenaltyValue,
      votingWindowHours: v.rules.votingWindowHours,
      complianceMode: "A",
      premium: false,
      createdAt: now,
    }).run();
    tx.insert(memberships).values({ id: newId(), circleId: id, userId, role: "admin", status: "active", joinedAt: now }).run();
    tx.insert(invites).values({ id: newId(), circleId: id, code: inviteCode(), createdBy: userId, uses: 0, createdAt: now }).run();
    return id;
  });
}

export function circleInviteCode(db: DbLike, circleId: string): string | null {
  return db.select().from(invites).where(eq(invites.circleId, circleId)).get()?.code ?? null;
}

export function regenerateInvite(db: Db, adminId: string, circleId: string, now: Date): string {
  requireAdmin(db, circleId, adminId);
  const code = inviteCode();
  const existing = db.select().from(invites).where(eq(invites.circleId, circleId)).get();
  if (existing) db.update(invites).set({ code, uses: 0, createdAt: now }).where(eq(invites.id, existing.id)).run();
  else db.insert(invites).values({ id: newId(), circleId, code, createdBy: adminId, uses: 0, createdAt: now }).run();
  return code;
}

export function previewInvite(db: DbLike, code: string) {
  const inv = db.select().from(invites).where(eq(invites.code, code.trim().toUpperCase())).get();
  if (!inv) return null;
  const circle = db.select().from(circles).where(eq(circles.id, inv.circleId)).get();
  if (!circle) return null;
  const admin = getUser(db, circle.creatorId);
  return { circle, memberCount: activeMemberIds(db, circle.id).length, adminName: admin.name, code: inv.code };
}

export function joinByInvite(db: Db, userId: string, code: string, now: Date): string {
  const user = getUser(db, userId);
  requireVerified(user); // circles are invite-only AND verified-only
  const preview = previewInvite(db, code);
  if (!preview) throw new AppError("That invite code does not match any circle.", "not_found");
  const circleId = preview.circle.id;
  if (getMembership(db, circleId, userId)) throw new AppError("You are already in this circle.", "conflict");
  db.transaction((tx) => {
    const prior = tx.select().from(memberships).where(and(eq(memberships.circleId, circleId), eq(memberships.userId, userId))).get();
    if (prior) tx.update(memberships).set({ status: "active", role: "member", joinedAt: now }).where(eq(memberships.id, prior.id)).run();
    else tx.insert(memberships).values({ id: newId(), circleId, userId, role: "member", status: "active", joinedAt: now }).run();
    tx.update(invites).set({ uses: sql`${invites.uses} + 1` }).where(eq(invites.code, preview.code)).run();
    notify(tx, preview.circle.creatorId, { kind: "info", title: "New member joined", body: `${user.name} joined ${preview.circle.name}.`, href: `/circles/${circleId}?tab=members` }, now);
  });
  return circleId;
}

export function removeMember(db: Db, adminId: string, circleId: string, memberId: string, now: Date) {
  requireAdmin(db, circleId, adminId);
  const m = getMembership(db, circleId, memberId);
  if (!m) throw new AppError("That person is not an active member.", "not_found");
  if (m.role === "admin") throw new AppError("The circle admin cannot be removed.");
  const borrowing = db.select().from(loans).where(and(eq(loans.circleId, circleId), eq(loans.borrowerId, memberId))).all()
    .some((l) => l.status === "repaying" || l.status === "approved" || l.status === "voting");
  const lending = db.select().from(loanLenders).innerJoin(loans, eq(loans.id, loanLenders.loanId))
    .where(and(eq(loans.circleId, circleId), eq(loanLenders.lenderId, memberId), eq(loans.status, "repaying"))).all().length > 0;
  if (borrowing || lending) throw new AppError("This member has an open loan (as borrower or lender). Settle it before removing them.", "conflict");
  db.update(memberships).set({ status: "removed" }).where(eq(memberships.id, m.id)).run();
  notify(db, memberId, { kind: "info", title: "Removed from a circle", body: "You were removed from a circle by its admin.", href: "/circles" }, now);
}

export function updateRules(db: Db, adminId: string, circleId: string, raw: unknown, now: Date) {
  requireAdmin(db, circleId, adminId);
  const parsed = circleRulesSchema.safeParse(raw);
  if (!parsed.success) throw new AppError(firstIssue(parsed.error));
  const r = parsed.data;
  db.transaction((tx) => {
    tx.update(circles).set({
      maxLoan: r.maxLoan,
      interestPct: r.interestPct,
      approvalThresholdPct: r.approvalThresholdPct,
      latePenaltyType: r.latePenaltyType,
      latePenaltyValue: r.latePenaltyValue,
      votingWindowHours: r.votingWindowHours,
    }).where(eq(circles.id, circleId)).run();
    for (const uid of activeMemberIds(tx, circleId)) {
      if (uid === adminId) continue;
      notify(tx, uid, { kind: "info", title: "Circle rules updated", body: "New rules apply to NEW loan requests only. Existing loans keep the rules they were approved under.", href: `/circles/${circleId}?tab=rules` }, now);
    }
  });
}

export function setComplianceMode(db: Db, adminId: string, circleId: string, mode: "A" | "C") {
  requireAdmin(db, circleId, adminId);
  db.update(circles).set({ complianceMode: mode }).where(eq(circles.id, circleId)).run();
}

export function upgradePremium(db: Db, adminId: string, circleId: string, pricePerMonth: number, now: Date) {
  requireAdmin(db, circleId, adminId);
  if (!Number.isInteger(pricePerMonth) || pricePerMonth < LIMITS.premiumMin || pricePerMonth > LIMITS.premiumMax) {
    throw new AppError(`Circle Premium is ${formatINR(LIMITS.premiumMin)}-${formatINR(LIMITS.premiumMax)} per month.`);
  }
  db.transaction((tx) => {
    tx.update(premiumSubscriptions).set({ active: false }).where(eq(premiumSubscriptions.circleId, circleId)).run();
    tx.insert(premiumSubscriptions).values({ id: newId(), circleId, pricePerMonth, startedAt: now, active: true }).run();
    tx.update(circles).set({ premium: true }).where(eq(circles.id, circleId)).run();
  });
}

export function cancelPremium(db: Db, adminId: string, circleId: string) {
  requireAdmin(db, circleId, adminId);
  db.transaction((tx) => {
    tx.update(premiumSubscriptions).set({ active: false }).where(eq(premiumSubscriptions.circleId, circleId)).run();
    tx.update(circles).set({ premium: false }).where(eq(circles.id, circleId)).run();
  });
}

/**
 * Contribution = a commitment recorded in the ledger plus a SIMULATED UPI confirmation. No money
 * moves to the platform; it stays in the member's bank account. A failed attempt is logged as a
 * failed ledger entry (it never counts toward the pool) and can be retried.
 */
export async function contribute(
  db: Db, userId: string, circleId: string, amount: number, outcome: "success" | "failure", now: Date,
): Promise<{ ok: boolean; message: string; upiRef: string }> {
  const user = getUser(db, userId);
  requireVerified(user);
  requireMember(db, circleId, userId);
  const parsed = contributionSchema.safeParse({ amount });
  if (!parsed.success) throw new AppError(firstIssue(parsed.error));
  const circle = db.select().from(circles).where(eq(circles.id, circleId)).get();
  if (!circle) throw new AppError("Circle not found", "not_found");

  const res = await services.upi.settle(
    { payerVpa: user.vpa, payeeVpa: `${circle.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}@circle`, payeeName: circle.name, amountPaise: amount, note: "Circle contribution (logged in app)", reference: "CONTRIB" },
    outcome,
  );
  if (res.status === "failed") {
    appendLedger(db, { circleId, actorId: userId, type: "CONTRIBUTION", amount, status: "failed", memo: `Failed attempt: ${res.reason}`, at: now });
    return { ok: false, message: res.reason, upiRef: res.upiRef };
  }
  db.transaction((tx) => {
    tx.insert(contributions).values({ id: newId(), circleId, userId, amount, upiRef: res.upiRef, createdAt: now }).run();
    appendLedger(tx, { circleId, actorId: userId, type: "CONTRIBUTION", amount, memo: `UPI ${res.upiRef}`, at: now });
  });
  return { ok: true, message: `${formatINR(amount)} added to the pool ledger`, upiRef: res.upiRef };
}
