import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, FileText, ShieldCheck } from "lucide-react";
import { requireCtx } from "@/lib/session";
import { AppError } from "@/lib/core/shared";
import { disbursementLink, loanDetail, repaymentBreakdown } from "@/lib/core/loans";
import { formatINR } from "@/lib/domain/money";
import { RISK_DISCLOSURE } from "@/lib/domain/constants";
import { Avatar, Badge, Card, KeyValue, Notice, PageHeader, ProgressBar, RiskBadge, SectionTitle, StatTile } from "@/components/ui";
import { StatusBadge, purposeLabel } from "@/components/loan-bits";
import { AutopayPanel, CloseVote, MarkDefault, PayShare, RepayNow, SimulateOthers } from "@/components/client/loan-panels";
import { CommentBox, RestructureForm, RestructureVote, VoteBox } from "@/components/client/loan-actions";
import { fmtDate, fmtDateTime, timeLeft } from "@/lib/utils";

export const metadata = { title: "Loan" };

export default async function LoanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ requested?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { db, user, now } = await requireCtx();
  let d: ReturnType<typeof loanDetail>;
  try { d = loanDetail(db, id, user.id, now); } catch (e) {
    if (e instanceof AppError && e.code === "not_found") notFound();
    if (e instanceof AppError) return <Notice tone="warn" title="Not available">{e.message}</Notice>;
    throw e;
  }
  const { loan, circle, borrower } = d;
  const myVote = d.votes.find((v) => v.userId === user.id);
  const canVote = d.status === "voting" && d.isMember && !d.isBorrower && !myVote && now.getTime() <= loan.votingEndsAt.getTime();
  const myShare = d.lenders.find((l) => l.lenderId === user.id);
  const dl = myShare && myShare.status !== "paid" && loan.status === "approved" ? disbursementLink(db, loan.id, user.id) : null;
  const next = d.nextInstalment;
  const nextTotal = next ? next.principal + next.interest + next.penalty : 0;
  const breakdown = loan.status === "repaying" && next ? repaymentBreakdown(db, loan.id, nextTotal) : [];
  const first = d.instalments[0];
  const emi = first ? first.principal + first.interest : 0;
  const pct = d.tally ? Math.min(d.tally.approvals / Math.max(d.required, 1), 1) : 0;

  return (
    <div>
      <PageHeader back="/loans" title={<span className="flex items-center gap-3"><Avatar name={borrower.name} size={44} />{d.isBorrower ? "Your loan" : borrower.name}</span>}
        subtitle={`${purposeLabel(loan.purpose)} · ${circle.name}`} action={<StatusBadge status={d.status} />} />
      {sp.requested && <Notice tone="pos" title="Request sent" className="mb-4">Members have been asked to vote. You will be notified when it is decided.</Notice>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <aside className="min-w-0 space-y-4 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <div className="text-xs font-medium text-muted">Loan amount</div>
          <div className="num text-3xl font-semibold tracking-tight">{formatINR(loan.amount)}</div>
          {(loan.status === "repaying" || loan.status === "closed") && d.plan && (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-muted"><span>Repaid</span><span className="num">{formatINR(Math.max(loan.amount - d.outstanding, 0))} of {formatINR(loan.amount)}</span></div>
              <ProgressBar value={loan.amount ? Math.max(loan.amount - d.outstanding, 0) / loan.amount : 0} label="Principal repaid" tone="pos" />
            </div>
          )}
          {loan.note && <p className="mt-3 rounded-xl bg-surface2 p-3 text-sm">“{loan.note}”</p>}
          <KeyValue className="mt-3" rows={[
            { k: "Tenure", v: `${loan.tenureMonths} month${loan.tenureMonths > 1 ? "s" : ""}` },
            { k: "Interest", v: `${loan.interestPct}% a year, simple` },
            { k: "Monthly instalment (about)", v: emi ? formatINR(emi, { showPaise: true }) : "n/a" },
            { k: "Total repayable", v: d.plan ? formatINR(d.plan.total, { showPaise: true }) : "n/a" },
            { k: "Platform fee (borrower pays)", v: `${formatINR(loan.platformFee, { showPaise: true })} (${loan.platformFeePct}%)` },
            { k: "Borrower type", v: loan.isExternal ? "Outside, vetted" : "Member" },
          ]} />
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm">
            <span className="text-muted">Risk at request</span>
            <RiskBadge band={d.risk.band} score={loan.riskScoreAtRequest ?? d.risk.score} />
            <Link href={`/risk?user=${borrower.id}`} className="font-semibold text-brand hover:underline">Why?</Link>
          </div>
          <p className="mt-3 text-xs text-muted">The fee is not taken from the circle's pool. Lenders pay the borrower directly by UPI.</p>
        </Card>

        {d.escrow && (
          <Card>
            <div className="mb-2 flex items-center gap-2"><ShieldCheck size={18} className="text-pos" aria-hidden="true" /><h2 className="text-sm font-semibold">Partner escrow</h2><Badge>Simulated</Badge></div>
            <p className="mb-3 text-xs text-muted">Compliance Mode A. {d.escrow.partnerName} is a placeholder partner.</p>
            <ol className="space-y-2">{d.escrow.stages.map((s) => (
              <li key={s.stage} className="flex items-center gap-2 text-sm">{s.done ? <CheckCircle2 size={16} className="text-pos" aria-label="done" /> : <Circle size={16} className="text-muted" aria-label="not yet" />}<span className={s.done ? "" : "text-muted"}>{s.label}</span></li>
            ))}</ol>
          </Card>
        )}
      </aside>

      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
      {d.status === "voting" && (
        <Card className="mb-5">
          <h2 className="text-base font-semibold">The vote</h2>
          <div className="mt-3 flex items-baseline justify-between text-sm"><span><span className="num text-2xl font-semibold">{d.tally.approvals}</span> <span className="text-muted">approvals of {d.required} needed</span></span><span className="text-muted">{timeLeft(loan.votingEndsAt, now.getTime())}</span></div>
          <div className="mt-2"><ProgressBar value={pct} label="Approvals toward the threshold" tone={pct >= 1 ? "pos" : "brand"} marker={1} /></div>
          <p className="mt-2 text-xs text-muted">{d.eligibleCount} eligible voter{d.eligibleCount === 1 ? "" : "s"} · {loan.thresholdPct}% must approve · rejections so far: {d.tally.rejections}</p>
          {canVote && <div className="mt-4"><VoteBox loanId={loan.id} /></div>}
          {myVote && <Notice className="mt-4" tone="pos">You voted to {myVote.choice}.</Notice>}
          {d.isBorrower && <Notice className="mt-4">You cannot vote on your own request. Voting is anonymous to the borrower's decision but names are visible to the circle.</Notice>}
          {d.isAdmin && <div className="mt-4"><CloseVote loanId={loan.id} /></div>}
          {d.votes.length > 0 && (
            <ul className="mt-4 divide-y divide-line text-sm">{d.votes.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-2"><span>{v.name}{v.comment && <span className="block text-xs text-muted">“{v.comment}”</span>}</span><Badge tone={v.choice === "approve" ? "pos" : "neg"}>{v.choice === "approve" ? "Approved" : "Rejected"}</Badge></li>
            ))}</ul>
          )}
        </Card>
      )}

      {d.status === "rejected" && <Notice tone="warn" title="Not approved" className="mb-5">The circle did not approve this request. The borrower can ask for a smaller amount.</Notice>}

      {loan.status === "approved" && (
        <Card className="mb-5" id="pay">
          <h2 className="text-base font-semibold">Lenders pay the borrower by UPI</h2>
          <p className="mb-3 text-sm text-muted">Each lender sends their own share straight to {borrower.name}'s UPI ID. The loan starts when every share is paid. Circlo never touches the money.</p>
          <ul className="divide-y divide-line">{d.lenders.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-3"><span className="font-medium">{l.lenderId === user.id ? "You" : l.name}</span><span className="flex items-center gap-2"><span className="num">{formatINR(l.amount)}</span><Badge tone={l.status === "paid" ? "pos" : "warn"}>{l.status === "paid" ? "Paid" : "To pay"}</Badge></span></li>
          ))}</ul>
          {dl && myShare && <div className="mt-4"><PayShare loanId={loan.id} amount={myShare.amount} borrowerName={borrower.name} borrowerVpa={borrower.vpa} link={dl.link} note={`Circlo loan: ${loan.purpose}`} /></div>}
          {d.isMember && d.lenders.some((l) => l.status !== "paid" && l.lenderId !== user.id) && <div className="mt-3"><SimulateOthers loanId={loan.id} /></div>}
        </Card>
      )}

      {loan.status === "repaying" && (
        <>
          <Card className="mb-5" id="repay">
            <h2 className="text-base font-semibold">Repayment</h2>
            <div className="mt-2 grid grid-cols-3 gap-2"><StatTile label="Outstanding" value={formatINR(d.outstandingNow)} /><StatTile label="Interest so far" value={formatINR(d.interestAccrued, { showPaise: true })} /><StatTile label="Penalties" value={formatINR(d.penaltiesOwed, { showPaise: true })} tone={d.penaltiesOwed ? "neg" : undefined} /></div>
            {d.hasOverdue && <Notice tone="neg" title="An instalment is overdue" className="mt-3">A late penalty of {loan.latePenaltyType === "flat" ? formatINR(loan.latePenaltyValue) : `${loan.latePenaltyValue}%`} applies per late instalment. Pay now, or ask the circle to restructure.</Notice>}
            {d.isBorrower && next && (
              <div className="mt-4 space-y-3">
                <RepayNow loanId={loan.id} amount={nextTotal} nextNumber={next.number} lenderNames={breakdown.map((b) => b.name).join(", ")} lenderVpas={breakdown.map((b) => b.vpa).join(", ")} />
                <ul className="rounded-2xl bg-surface2 p-3 text-sm">{breakdown.map((b) => <li key={b.lenderId} className="flex justify-between py-0.5"><span>{b.name}</span><span className="num">{formatINR(b.amount, { showPaise: true })}</span></li>)}</ul>
              </div>
            )}
            {d.isBorrower && <div className="mt-5 border-t border-line pt-4"><h3 className="mb-2 font-semibold">AutoPay</h3><AutopayPanel loanId={loan.id} active={!!d.mandate} vpa={borrower.vpa} /></div>}
          </Card>
        </>
      )}

      {loan.status === "defaulted" && d.losses && (
        <Card className="mb-5">
          <h2 className="text-base font-semibold">Default and risk sharing</h2>
          <p className="mt-1 text-sm text-muted">{formatINR(d.losses.loss)} of principal was written off. Lenders share the loss in proportion to what each lent. The pool is not topped up from anyone else's contribution.</p>
          <ul className="mt-3 divide-y divide-line text-sm">{d.losses.shares.map((s) => <li key={s.lenderId} className="flex justify-between py-2"><span>{s.lenderId === user.id ? "You" : s.name}</span><span className="num font-semibold">{formatINR(s.loss)} <span className="font-normal text-muted">({Math.round(s.pct)}%)</span></span></li>)}</ul>
          <Notice tone="warn" className="mt-3">{RISK_DISCLOSURE}</Notice>
        </Card>
      )}

      {d.instalments.length > 0 && (
        <>
          <SectionTitle action={<Link href={`/loans/${loan.id}/agreement`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand"><FileText size={16} aria-hidden="true" /> Agreement</Link>}>Schedule</SectionTitle>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[340px] text-sm">
              <caption className="sr-only">Repayment schedule</caption>
              <thead><tr className="border-b border-line text-left text-xs text-muted"><th scope="col" className="px-2 py-3 sm:p-3">#</th><th scope="col" className="px-2 py-3 sm:p-3">Due</th><th scope="col" className="p-3 text-right">Principal</th><th scope="col" className="p-3 text-right">Interest</th><th scope="col" className="p-3 text-right">Status</th></tr></thead>
              <tbody>{d.instalments.map((i) => (
                <tr key={i.id} className="border-b border-line last:border-0">
                  <td className="num px-2 py-3 sm:p-3">{i.number}</td><td className="px-2 py-3 sm:p-3">{fmtDate(i.dueDate)}</td>
                  <td className="num p-3 text-right">{formatINR(i.principal, { showPaise: true })}</td><td className="num p-3 text-right">{formatINR(i.interest, { showPaise: true })}{i.penalty > 0 && <span className="block text-xs text-neg">+{formatINR(i.penalty)} penalty</span>}</td>
                  <td className="p-3 text-right"><Badge tone={i.status === "paid" ? "pos" : i.status === "overdue" ? "neg" : i.status === "due" ? "warn" : "neutral"}>{i.status === "paid" ? "Paid" : i.status === "overdue" ? "Overdue" : i.status === "due" ? "Due soon" : "Upcoming"}</Badge></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}

      {loan.status === "repaying" && (
        <>
          <SectionTitle>Trouble repaying?</SectionTitle>
          <Card className="space-y-4">
            {d.proposal && d.proposal.status === "open" ? (
              <div className="space-y-3">
                <Notice title={`Restructure proposed: ${d.proposal.newMonths} month(s)`}>{d.proposal.reason}</Notice>
                <p className="text-sm text-muted">Votes so far: {d.proposalVotes.map((v) => `${v.name} (${v.choice})`).join(", ") || "none"}</p>
                {d.isMember && !d.isBorrower && !d.proposalVotes.some((v) => v.userId === user.id) && <RestructureVote proposalId={d.proposal.id} />}
              </div>
            ) : (d.isBorrower || d.isAdmin) ? (
              <><p className="text-sm text-muted">Spread what is left over more months. Members vote. Rewrites only the unpaid part; paid instalments stay as they are.</p><RestructureForm loanId={loan.id} currentMonths={loan.tenureMonths} /></>
            ) : <p className="text-sm text-muted">If {borrower.name} struggles, the borrower or the admin can propose a new schedule, and members vote.</p>}
            {d.isAdmin && d.hasOverdue && <div className="border-t border-line pt-3"><p className="mb-2 text-sm text-muted">If it cannot be resolved, the admin can mark the loan as defaulted.</p><MarkDefault loanId={loan.id} /></div>}
          </Card>
        </>
      )}

      <SectionTitle>Discussion</SectionTitle>
      <Card className="space-y-4">
        {d.comments.length === 0 ? <p className="text-sm text-muted">No comments yet.</p> : (
          <ul className="space-y-3">{d.comments.map((c) => (
            <li key={c.id} className="text-sm"><div className="flex items-center gap-2"><span className="font-semibold">{c.name}</span>{c.kind === "mediation" && <Badge tone="brand">Mediation</Badge>}<span className="text-xs text-muted">{fmtDateTime(c.createdAt)}</span></div><p>{c.body}</p></li>
          ))}</ul>
        )}
        {d.isMember && <CommentBox loanId={loan.id} mediation={d.hasOverdue && d.isAdmin} />}
      </Card>
      </div>
      </div>
    </div>
  );
}
