"use server";

import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/core/shared";
import { endSession, getCtx, startSession } from "@/lib/session";
import { profileSchema, phoneSchema } from "@/lib/domain/validation";
import { services, DEMO_OTP } from "@/lib/services/simulated";
import { guard, makeKycToken, readKycToken, type ActionResult } from "./helpers";
import { AppError } from "@/lib/core/shared";

const DEMO = { student: "9876500001", admin: "9876500002", professional: "9876500003" } as const;

/** Step 1: phone number. Sends a (simulated) OTP. */
export async function startSignup(phone: string): Promise<ActionResult> {
  return guard(async () => {
    const p = phoneSchema.safeParse(phone);
    if (!p.success) throw new AppError(p.error.issues[0].message);
    const exists = getDb().select().from(schema.users).where(eq(schema.users.phone, p.data)).get();
    if (exists) throw new AppError("That number already has an account. Log in instead.");
    return { message: `Demo OTP: ${DEMO_OTP}`, data: { demoOtp: DEMO_OTP } };
  });
}

export async function verifyPhoneOtp(otp: string): Promise<ActionResult> {
  return guard(async () => {
    const r = await services.kyc.confirmOtp({ otp });
    if (!r.ok) throw new AppError(r.error ?? "Wrong code");
  });
}

/** Step 3: PAN or Aadhaar. Format-checked only; only the masked value is ever kept. */
export async function startKyc(idType: "pan" | "aadhaar", idNumber: string): Promise<ActionResult> {
  return guard(async () => {
    const r = await services.kyc.startVerification({ idType, idNumber });
    if (!r.ok) throw new AppError(r.error);
    return { message: `Demo OTP: ${r.demoOtp}`, data: { maskedId: r.maskedId, demoOtp: r.demoOtp } };
  });
}

export async function confirmKyc(phone: string, idType: "pan" | "aadhaar", maskedId: string, otp: string): Promise<ActionResult> {
  return guard(async () => {
    const r = await services.kyc.confirmOtp({ otp });
    if (!r.ok) throw new AppError(r.error ?? "Wrong code");
    return { data: { token: makeKycToken(phone, idType, maskedId) } };
  });
}

export async function completeSignup(input: {
  phone: string; kycToken: string; name: string; city: string; segment: string; vpa: string; institution?: string;
}): Promise<ActionResult> {
  return guard(async () => {
    const phone = phoneSchema.parse(input.phone);
    const kyc = readKycToken(input.kycToken, phone);
    if (!kyc) throw new AppError("Verification expired. Please redo the eKYC step.");
    const prof = profileSchema.safeParse({ name: input.name, city: input.city, segment: input.segment, vpa: input.vpa, institution: input.institution || undefined });
    if (!prof.success) throw new AppError(prof.error.issues[0].message);
    const db = getDb();
    if (db.select().from(schema.users).where(eq(schema.users.phone, phone)).get()) throw new AppError("That number already has an account.");
    const id = newId();
    const now = new Date();
    db.transaction((tx) => {
      tx.insert(schema.users).values({
        id, phone, name: prof.data.name, city: prof.data.city, segment: prof.data.segment, vpa: prof.data.vpa,
        institution: prof.data.institution ?? null, kycStatus: "verified", vetted: false, isPlatformAdmin: false, createdAt: now,
      }).run();
      tx.insert(schema.kycRecords).values({ id: newId(), userId: id, idType: kyc.idType, maskedId: kyc.maskedId, provider: "simulated", verifiedAt: now }).run();
    });
    await startSession(id);
    return { redirectTo: "/home?welcome=1" };
  });
}

export async function login(phone: string, otp: string): Promise<ActionResult> {
  return guard(async () => {
    const p = phoneSchema.safeParse(phone);
    if (!p.success) throw new AppError(p.error.issues[0].message);
    const otpOk = await services.kyc.confirmOtp({ otp });
    if (!otpOk.ok) throw new AppError(otpOk.error ?? "Wrong code");
    const u = getDb().select().from(schema.users).where(eq(schema.users.phone, p.data)).get();
    if (!u) throw new AppError("No account for that number yet. Sign up first.");
    await startSession(u.id);
    return { redirectTo: "/home" };
  });
}

/** One-click demo personas and the "Switch demo user" menu. */
export async function loginAsPersona(persona: keyof typeof DEMO): Promise<ActionResult> {
  return guard(async () => {
    const u = getDb().select().from(schema.users).where(eq(schema.users.phone, DEMO[persona])).get();
    if (!u) throw new AppError("Demo data is missing. Run `npm run seed`.");
    const ctx = await getCtx();
    if (ctx.user) await endSession();
    await startSession(u.id);
    return { redirectTo: "/home" };
  });
}

export async function logout(): Promise<ActionResult> {
  return guard(async () => {
    await endSession();
    return { redirectTo: "/" };
  });
}
