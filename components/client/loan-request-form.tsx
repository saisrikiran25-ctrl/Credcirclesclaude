"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PURPOSES } from "@/lib/config";
import { LIMITS } from "@/lib/domain/constants";
import { emiPreview } from "@/lib/domain/emi";
import { formatINR } from "@/lib/domain/money";
import { platformFee } from "@/lib/domain/validation";
import { requestLoanAction } from "@/lib/actions/loans";
import { Notice, btnClass } from "@/components/ui";
import { Chips, RupeeInput, SelectInput, TextInput } from "./form-bits";
import { useToast } from "./toast";

export function LoanRequestForm({ circleId, interestPct, maxAmount, recommendedMax }: { circleId: string; interestPct: number; maxAmount: number; recommendedMax: number }) {
  const [rupees, setRupees] = useState(String(Math.min(Math.max(LIMITS.loanMin, 0), maxAmount || LIMITS.loanMin) / 100));
  const [purpose, setPurpose] = useState<string>("education");
  const [months, setMonths] = useState("3");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const { show } = useToast();

  const amount = Math.round(Number(rupees) * 100);
  const m = Number(months);
  const okAmount = Number.isFinite(amount) && amount >= LIMITS.loanMin && amount <= Math.min(maxAmount, LIMITS.loanMax);
  const okMonths = Number.isInteger(m) && m >= LIMITS.tenureMin && m <= LIMITS.tenureMax;
  const preview = useMemo(() => (okAmount && okMonths ? emiPreview(amount, interestPct, m) : null), [okAmount, okMonths, amount, interestPct, m]);
  const fee = okAmount ? platformFee(amount) : 0;
  const overRec = okAmount && amount > recommendedMax;

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(""); start(async () => {
      const r = await requestLoanAction(circleId, { amount, purpose, tenureMonths: m, interestPct, note: note || undefined });
      if (r.ok && r.redirectTo) { show(r.message ?? "Sent"); router.push(r.redirectTo); } else if (!r.ok) { setError(r.error); show(r.error, "error"); }
    }); }}>
      <RupeeInput label="How much do you need?" value={rupees} onChange={setRupees} min={5000} max={Math.min(maxAmount, LIMITS.loanMax) / 100} step={500}
        hint={`₹5,000 to ${formatINR(Math.min(maxAmount, LIMITS.loanMax))} (lowest of: circle limit, pilot cap, what lenders can cover).`}
        error={rupees && !okAmount ? `Enter between ₹5,000 and ${formatINR(Math.min(maxAmount, LIMITS.loanMax))}.` : undefined} />
      <SelectInput label="What is it for?" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
        {PURPOSES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </SelectInput>
      <Chips label="Repay over" value={months} onChange={setMonths} options={[1, 2, 3, 4, 5, 6].map((n) => ({ id: String(n), label: `${n} month${n > 1 ? "s" : ""}` }))} />
      <TextInput label="Note to the circle (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} placeholder="A line of context helps members decide." />
      {preview && (
        <div className="rounded-2xl bg-surface2 p-4 text-sm" aria-live="polite">
          <div className="mb-2 font-semibold">What you will pay</div>
          <dl className="grid grid-cols-2 gap-y-1.5">
            <dt className="text-muted">Monthly instalment (about)</dt><dd className="num text-right font-semibold">{formatINR(preview.emi, { showPaise: true })}</dd>
            <dt className="text-muted">Interest ({interestPct}% a year, simple)</dt><dd className="num text-right">{formatINR(preview.totalInterest, { showPaise: true })}</dd>
            <dt className="text-muted">Total repayable</dt><dd className="num text-right font-semibold">{formatINR(preview.totalRepayable, { showPaise: true })}</dd>
            <dt className="text-muted">Platform fee ({LIMITS.platformFeeDefaultPct}% of the loan)</dt><dd className="num text-right">{formatINR(fee, { showPaise: true })}</dd>
          </dl>
        </div>
      )}
      {overRec && <Notice tone="warn" title="Above the recommended exposure">The circle's pool suggests staying near {formatINR(recommendedMax)} so no single loan dominates. You can still ask; members will see this.</Notice>}
      {error && <p role="alert" className="text-sm font-medium text-neg">{error}</p>}
      <button type="submit" disabled={pending || !okAmount || !okMonths} className={btnClass("accent", "lg", true)}>{pending && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} Send to the circle for a vote</button>
    </form>
  );
}
