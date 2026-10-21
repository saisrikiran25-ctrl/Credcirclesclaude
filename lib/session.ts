import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId, type UserRow } from "@/lib/core/shared";
import { sweep } from "@/lib/core/loans";

const COOKIE = "circlo_session";
const SEVEN_DAYS = 7 * 24 * 3600;

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
    const s = db.select().from(schema.sessions).where(eq(schema.sessions.token, token)).get();
    if (s) user = db.select().from(schema.users).where(eq(schema.users.id, s.userId)).get() ?? null;
  }
  return { db, now, user };
});

export async function requireCtx() {
  const ctx = await getCtx();
  if (!ctx.user) redirect("/login");
  return { ...ctx, user: ctx.user };
}

export async function startSession(userId: string) {
  const db = getDb();
  const token = `${newId()}${newId()}`.replace(/-/g, "");
  db.insert(schema.sessions).values({ token, userId, createdAt: new Date() }).run();
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS,
    secure: process.env.CIRCLO_SECURE_COOKIES === "1",
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) getDb().delete(schema.sessions).where(eq(schema.sessions.token, token)).run();
  jar.delete(COOKIE);
}
