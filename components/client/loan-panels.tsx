"use client";

import { BadgeCheck, Zap } from "lucide-react";
import { cancelMandateAction, closeVoteAction, markDefaultAction, payShareAction, repayAction, runAutopayAction, setupMandateAction, simulateOthersAction } from "@/lib/actions/loans";
import { formatINR } from "@/lib/domain/money";
import { Badge } from "@/components/ui";
import { ActionButton } from "./action-button";
import { UpiPayButton } from "./upi-sheet";

/** A lender paying their own share straight to the borrower's UPI ID. */
export function PayShare({ loanId, amount, borrowerName, borrowerVpa, link, note }: { loanId: string; amount: number; borrowerName: string; borrowerVpa: string; link?: string; note: string }) {
  return (
    <UpiPayButton label={`Pay ${formatINR(amount)} to ${borrowerName}`} title="Pay your share" payeeName={borrowerName} payeeVpa={borrowerVpa} amount={amount} note={note} link={link}
      payAction={(o) => payShareAction(loanId, o)} successText="Your share is recorded" doneHref={`/loans/${loanId}`}
      hint="You pay the borrower directly. Circlo never holds this money." />
  );
}

export function SimulateOthers({ loanId }: { loanId: string }) {
  return <ActionButton variant="ghost" size="sm" action={() => simulateOthersAction(loanId)}>Demo: let the other lenders pay</ActionButton>;
}

export function CloseVote({ loanId }: { loanId: string }) {
  return <ActionButton variant="ghost" size="sm" confirm="Close voting now? The result is counted as it stands." action={() => closeVoteAction(loanId)}>Close voting now</ActionButton>;
}

export function MarkDefault({ loanId }: { loanId: string }) {
  return <ActionButton variant="danger" size="sm" confirm="Mark as defaulted? The unpaid principal is written off and lenders share the loss." action={() => markDefaultAction(loanId)}>Mark as defaulted</ActionButton>;
}

export function RepayNow({ loanId, amount, lenderNames, lenderVpas, nextNumber }: { loanId: string; amount: number; lenderNames: string; lenderVpas: string; nextNumber: number }) {
  return (
    <UpiPayButton label={`Pay instalment ${nextNumber}: ${formatINR(amount, { showPaise: true })}`} variant="accent" title="Pay instalment" payeeName={lenderNames} payeeVpa={lenderVpas} amount={amount} note="Circlo repayment"
      payAction={(o) => repayAction(loanId, o)} successText="Repayment recorded" doneHref={`/loans/${loanId}`}
      hint="Split across the lenders in proportion to what each funded." />
  );
}

export function AutopayPanel({ loanId, active, vpa }: { loanId: string; active: boolean; vpa: string }) {
  return active ? (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><BadgeCheck className="text-pos" size={22} aria-hidden="true" /><span className="font-semibold">AutoPay is on</span><Badge tone="pos">UPI AutoPay</Badge></div>
      <p className="text-sm text-muted">Each instalment is debited from <span className="num">{vpa}</span> on its due date. You can cancel any time.</p>
      <div className="flex flex-wrap gap-2">
        <ActionButton size="sm" variant="soft" action={() => runAutopayAction(loanId)}><Zap size={16} aria-hidden="true" /> Demo: run the next debit now</ActionButton>
        <ActionButton size="sm" variant="ghost" confirm="Cancel AutoPay for this loan?" action={() => cancelMandateAction(loanId)}>Cancel AutoPay</ActionButton>
      </div>
    </div>
  ) : (
    <div className="space-y-3">
      <p className="text-sm text-muted">Let each instalment be debited automatically on its due date, so you never pay a late penalty by accident. Simulated UPI AutoPay mandate on <span className="num">{vpa}</span>.</p>
      <ActionButton variant="primary" full action={() => setupMandateAction(loanId)}>Set up AutoPay</ActionButton>
    </div>
  );
}
