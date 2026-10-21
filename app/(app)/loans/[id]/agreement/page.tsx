import { notFound } from "next/navigation";
import { requireCtx } from "@/lib/session";
import { AppError } from "@/lib/core/shared";
import { loanDetail } from "@/lib/core/loans";
import { formatINR } from "@/lib/domain/money";
import { APP_NAME } from "@/lib/config";
import { Notice, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/client/print-button";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Loan agreement" };

export default async function Agreement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, user, now } = await requireCtx();
  let d;
  try { d = loanDetail(db, id, user.id, now); } catch (e) { if (e instanceof AppError) notFound(); throw e; }
  const { loan, circle, borrower } = d;
  return (
    <div>
      <div className="no-print"><PageHeader back={`/loans/${id}`} title="Loan agreement" action={<PrintButton />} /></div>
      <Notice tone="warn" className="no-print mb-4" title="Template only">This is a placeholder for the prototype, not legal advice. Have a lawyer review it before real use.</Notice>
      <article className="print-page rounded-3xl border border-line bg-surface p-6 text-sm leading-relaxed sm:p-8">
        <h1 className="font-display text-2xl font-semibold">Loan agreement (template)</h1>
        <p className="mt-1 text-muted">Reference {loan.id.slice(0, 8).toUpperCase()} · generated {fmtDate(now)} on {APP_NAME}</p>
        <h2 className="mt-5 font-semibold">1. Parties</h2>
        <p>Borrower: {borrower.name} (UPI {borrower.vpa}). Lenders: {d.lenders.length ? d.lenders.map((l) => `${l.name} (${formatINR(l.amount)})`).join(", ") : "to be decided when the circle approves"}. Circle: {circle.name}.</p>
        <h2 className="mt-4 font-semibold">2. Loan</h2>
        <p>Principal {formatINR(loan.amount)} for {loan.tenureMonths} month(s) at {loan.interestPct}% per year, simple interest, repayable in monthly instalments as per the schedule below. Platform fee {loan.platformFeePct}% ({formatINR(loan.platformFee, { showPaise: true })}) is paid by the borrower.</p>
        <h2 className="mt-4 font-semibold">3. Late payment</h2>
        <p>A penalty of {loan.latePenaltyType === "flat" ? formatINR(loan.latePenaltyValue) : `${loan.latePenaltyValue}% of the instalment`} applies per late instalment.</p>
        <h2 className="mt-4 font-semibold">4. Default and risk sharing</h2>
        <p>If the loan is declared defaulted by the circle admin, the unpaid principal is shared by the lenders in proportion to their funded amounts. Lending carries risk of loss.</p>
        <h2 className="mt-4 font-semibold">5. Money flow</h2>
        <p>Lenders pay the borrower directly by UPI and the borrower repays lenders directly. {APP_NAME} is a connector and record keeper, holds no funds, and is not a lender.</p>
        <h2 className="mt-4 font-semibold">6. Schedule</h2>
        <table className="mt-2 w-full text-left"><thead><tr className="border-b border-line"><th className="py-1">#</th><th>Due</th><th className="text-right">Principal</th><th className="text-right">Interest</th></tr></thead>
          <tbody>{d.instalments.map((i) => <tr key={i.id}><td className="py-1">{i.number}</td><td>{fmtDate(i.dueDate)}</td><td className="num text-right">{formatINR(i.principal, { showPaise: true })}</td><td className="num text-right">{formatINR(i.interest, { showPaise: true })}</td></tr>)}</tbody></table>
        <p className="mt-6 text-xs text-muted">Digitally acknowledged within {APP_NAME} by the borrower and the approving circle. Signature blocks and stamp duty are out of scope for this prototype.</p>
      </article>
    </div>
  );
}
