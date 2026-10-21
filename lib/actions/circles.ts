"use server";

import { requireCtx } from "@/lib/session";
import {
  cancelPremium, contribute, createCircle, joinByInvite, regenerateInvite, removeMember, setComplianceMode, updateRules, upgradePremium,
} from "@/lib/core/circles";
import { guard, type ActionResult } from "./helpers";
import { AppError } from "@/lib/core/shared";

export async function createCircleAction(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    const id = createCircle(db, user.id, input, now);
    return { redirectTo: `/circles/${id}?tab=invite&created=1` };
  });
}

export async function joinAction(code: string): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    const id = joinByInvite(db, user.id, code, now);
    return { redirectTo: `/circles/${id}`, message: "Welcome to the circle" };
  });
}

export async function contributeAction(circleId: string, amount: number, outcome: "success" | "failure"): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    const r = await contribute(db, user.id, circleId, amount, outcome, now);
    if (!r.ok) throw new AppError(r.message);
    return { message: r.message, data: { upiRef: r.upiRef } };
  }, { revalidate: false });
}

export async function updateRulesAction(circleId: string, rules: unknown): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    updateRules(db, user.id, circleId, rules, now);
    return { message: "Rules updated. They apply to new loan requests only." };
  });
}

export async function setComplianceAction(circleId: string, mode: "A" | "C"): Promise<ActionResult> {
  return guard(async () => {
    const { db, user } = await requireCtx();
    setComplianceMode(db, user.id, circleId, mode);
    return { message: mode === "A" ? "Mode A: partnered (simulated NBFC-P2P partner)" : "Mode C: closed circle only" };
  });
}

export async function removeMemberAction(circleId: string, memberId: string): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    removeMember(db, user.id, circleId, memberId, now);
    return { message: "Member removed" };
  });
}

export async function regenerateInviteAction(circleId: string): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    const code = regenerateInvite(db, user.id, circleId, now);
    return { message: `New invite code: ${code}`, data: { code } };
  });
}

export async function upgradePremiumAction(circleId: string, pricePerMonth: number): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    upgradePremium(db, user.id, circleId, pricePerMonth, now);
    return { message: "Circle Premium is on (simulated billing)" };
  });
}

export async function cancelPremiumAction(circleId: string): Promise<ActionResult> {
  return guard(async () => {
    const { db, user } = await requireCtx();
    cancelPremium(db, user.id, circleId);
    return { message: "Circle Premium cancelled" };
  });
}
