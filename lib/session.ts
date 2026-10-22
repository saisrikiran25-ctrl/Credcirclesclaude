import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { UserRow } from "@/lib/core/shared";
import { sweep } from "@/lib/core/loans";

const COOKIE = "circlo_session";
const SEVEN_DAYS = 7 * 24 * 3600;

const SECRET = process.env.CIRCLO_SECRET ?? "circlo-dev-secret-change-me";
const sign = (userId: string) => createHmac("sha256", SECRET).update(`session|${userId}`).digest("hex");

/**
 * Stateless signed session cookie ("<userId>.<hmac>"). No session row is needed, so a login keeps
 * working when the app runs on several short-lived serverless instances (e.g. Vercel).
 */
function userIdFromToken(token: string): string | null {
  const [id, sig] = token.split(".");
  if (!id || !sig) return null;
  const expected = sign(id);
  if (sig.length !== expected.length) return null;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? id : null;
}

let lastSweep = 0;

/** Idle housekeeping (expire votes, late fees, AutoPay debits). Throttled; cheap and idempotent. */
function maybeSweep(now: Date) {
  if (now.getTime() - lastSweep < 15_000) return;
  lastSweep = now.getTime();
  sweep(getDb(), now);
}

export const getCtx = cache(async () => {
  const db = getDb();
  const now = new Date();
  maybeSweep(now);
  const token = (await cookies()).get(COOKIE)?.value;
  let user: UserRow | null = null;
  if (token) {
    const id = userIdFromToken(token);
    if (id) user = db.select().from(schema.users).where(eq(schema.users.id, id)).get() ?? null;
  }
  return { db, now, user };
});

export async function requireCtx() {
  const ctx = await getCtx();
  if (!ctx.user) redirect("/login");
  return { ...ctx, user: ctx.user };
}

export async function startSession(userId: string) {
  (await cookies()).set(COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS,
    secure: process.env.CIRCLO_SECURE_COOKIES === "1" || !!process.env.VERCEL,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}
