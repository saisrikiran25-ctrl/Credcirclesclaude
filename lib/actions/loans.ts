"use server";

import { eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { requireCtx } from "@/lib/session";
import {
  addComment, castVote, cancelMandate, closeVote, markDefault, payShare, proposeRestructure, repayManual, requestLoan,
  runAutopayNow, setupMandate, simulateOtherLenders, voteRestructure,
} from "@/lib/core/loans";
import { AppError } from "@/lib/core/shared";
import { guard, type ActionResult } from "./helpers";

export async function requestLoanAction(circleId: string, input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    const id = requestLoan(db, user.id, circleId, input, now);
    return { redirectTo: `/loans/${id}?requested=1`, message: "Request sent to the circle for a vote" };
  });
}

export async function voteAction(loanId: string, choice: "approve" | "reject", comment?: string): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    castVote(db, user.id, loanId, choice, comment, now);
    return { message: choice === "approve" ? "You approved this request" : "You rejected this request" };
  });
}

export async function closeVoteAction(loanId: string): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    closeVote(db, user.id, loanId, now);
    return { message: "Vote closed" };
  });
}

export async function commentAction(loanId: string, body: string, kind: "comment" | "mediation"): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    addComment(db, user.id, loanId, body, kind, now);
    return { message: kind === "mediation" ? "Mediation note added" : "Comment added" };
  });
}

export async function payShareAction(loanId: string, outcome: "success" | "failure"): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    const r = await payShare(db, user.id, loanId, outcome, now);
    if (!r.ok) throw new AppError(r.message);
    return { message: r.message, data: { upiRef: r.upiRef } };
  }, { revalidate: false });
}

export async function simulateOthersAction(loanId: string): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    simulateOtherLenders(db, user.id, loanId, now);
    return { message: "Other lenders simulated as paid (demo)" };
  });
}

export async function repayAction(loanId: string, outcome: "success" | "failure"): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    const r = await repayManual(db, user.id, loanId, outcome, now);
    if (!r.ok) throw new AppError(r.message);
    return { message: r.message, data: { upiRef: r.upiRef } };
  }, { revalidate: false });
}

export async function setupMandateAction(loanId: string): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    const ref = await setupMandate(db, user.id, loanId, now);
    return { message: `AutoPay mandate active (${ref}, simulated)` };
  });
}

export async function cancelMandateAction(loanId: string): Promise<ActionResult> {
  return guard(async () => {
    const { db, user } = await requireCtx();
    cancelMandate(db, user.id, loanId);
    return { message: "AutoPay cancelled" };
  });
}

export async function runAutopayAction(loanId: string): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    runAutopayNow(db, user.id, loanId, now);
    return { message: "AutoPay debited the next instalment" };
  });
}

export async function proposeRestructureAction(loanId: string, months: number, reason: string): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    proposeRestructure(db, user.id, loanId, months, reason, now);
    return { message: "Restructure proposal sent to the circle" };
  });
}

export async function voteRestructureAction(proposalId: string, choice: "approve" | "reject"): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    voteRestructure(db, user.id, proposalId, choice, now);
    return { message: "Vote recorded" };
  });
}

export async function markDefaultAction(loanId: string): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    markDefault(db, user.id, loanId, now);
    return { message: "Loan marked as defaulted. The loss is shared by lenders." };
  });
}

export async function markNotificationsReadAction(): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    db.update(schema.notifications).set({ readAt: now }).where(eq(schema.notifications.userId, user.id)).run();
    return {};
  });
}

export async function submitNpsAction(score: number): Promise<ActionResult> {
  return guard(async () => {
    const { db, user, now } = await requireCtx();
    if (!Number.isInteger(score) || score < 0 || score > 10) throw new AppError("Pick a score from 0 to 10.");
    db.insert(schema.npsResponses).values({ id: crypto.randomUUID(), userId: user.id, score, createdAt: now }).run();
    return { message: "Thanks for the feedback" };
  });
}
