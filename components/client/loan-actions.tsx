"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";
import { addMonthsLabel } from "@/lib/utils";
import { commentAction, proposeRestructureAction, voteAction, voteRestructureAction } from "@/lib/actions/loans";
import { btnClass } from "@/components/ui";
import { ActionButton } from "./action-button";
import { TextInput } from "./form-bits";
import { useToast } from "./toast";

export function VoteBox({ loanId }: { loanId: string }) {
  const [comment, setComment] = useState("");
  return (
    <div className="space-y-3">
      <TextInput label="Add a note (optional)" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={200} hint="Visible to the circle." />
      <div className="grid grid-cols-2 gap-3">
        <ActionButton variant="primary" size="lg" action={() => voteAction(loanId, "approve", comment || undefined)}><Check size={18} aria-hidden="true" /> Approve</ActionButton>
        <ActionButton variant="ghost" size="lg" action={() => voteAction(loanId, "reject", comment || undefined)}><X size={18} aria-hidden="true" /> Reject</ActionButton>
      </div>
    </div>
  );
}

export function CommentBox({ loanId, mediation }: { loanId: string; mediation?: boolean }) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const { show } = useToast();
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!body.trim()) return; start(async () => {
      const r = await commentAction(loanId, body, mediation ? "mediation" : "comment");
      if (r.ok) setBody(""); else show(r.error, "error");
    }); }}>
      <input aria-label={mediation ? "Mediation note" : "Comment"} value={body} onChange={(e) => setBody(e.target.value)} maxLength={300} placeholder={mediation ? "Add a mediation note…" : "Write a comment…"} className="min-h-12 min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 text-[15px]" />
      <button type="submit" disabled={pending || !body.trim()} className={btnClass("soft", "md")}>{pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : "Post"}</button>
    </form>
  );
}

export function RestructureForm({ loanId, currentMonths }: { loanId: string; currentMonths: number }) {
  const [months, setMonths] = useState(String(Math.min(currentMonths + 2, 12)));
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const { show } = useToast();
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); start(async () => {
      const r = await proposeRestructureAction(loanId, Number(months), reason);
      if (r.ok) show("Proposal sent to the circle"); else show(r.error, "error");
    }); }}>
      <TextInput label="Spread the remaining balance over (months)" type="number" min={1} max={12} value={months} onChange={(e) => setMonths(e.target.value)} hint={addMonthsLabel(Number(months))} />
      <TextInput label="Why (the circle will read this)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
      <button type="submit" disabled={pending || reason.trim().length < 5} className={btnClass("soft", "md", true)}>{pending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Propose new schedule</button>
    </form>
  );
}

export function RestructureVote({ proposalId }: { proposalId: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <ActionButton action={() => voteRestructureAction(proposalId, "approve")}>Approve</ActionButton>
      <ActionButton variant="ghost" action={() => voteRestructureAction(proposalId, "reject")}>Reject</ActionButton>
    </div>
  );
}
