import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/core/shared";

export type ActionResult =
  | { ok: true; message?: string; redirectTo?: string; data?: Record<string, string | number | boolean | null> }
  | { ok: false; error: string };

/** Run a mutation; turn expected AppErrors into friendly messages, log anything else. */
export async function guard(
  fn: () => Promise<Omit<Extract<ActionResult, { ok: true }>, "ok"> | void>,
  /** Pass false when a client component shows a success state and refreshes itself on close (UPI sheet). */
  opts: { revalidate?: boolean } = {},
): Promise<ActionResult> {
  try {
    const r = (await fn()) ?? {};
    if (opts.revalidate !== false) revalidatePath("/", "layout");
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    // Next's redirect()/notFound() throw control-flow errors that must propagate.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error("[action error]", e);
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

const SECRET = process.env.CIRCLO_SECRET ?? "circlo-dev-secret-change-me";
const sign = (payload: string) => createHmac("sha256", SECRET).update(payload).digest("hex");

/** Proof that the simulated KYC step passed for this phone + masked ID (so the client cannot fake it). */
export function makeKycToken(phone: string, idType: string, maskedId: string): string {
  const payload = `${phone}|${idType}|${maskedId}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}
export function readKycToken(token: string, phone: string): { idType: string; maskedId: string } | null {
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const payload = Buffer.from(b64, "base64url").toString();
  const expected = sign(payload);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  const [p, idType, maskedId] = payload.split("|");
  return p === phone ? { idType, maskedId } : null;
}
