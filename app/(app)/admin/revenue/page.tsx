import { requireCtx } from "@/lib/session";
import { revenueView } from "@/lib/core/admin";
import { formatINR } from "@/lib/domain/money";
import { Card, Notice, PageHeader, SectionTitle, StatTile } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Revenue" };

export default async function Revenue() {
  const { db } = await requireCtx();
  const r = revenueView(db);
  return (
    <div>
      <PageHeader title="Revenue" subtitle="Platform fees (1.5% of principal, paid by borrowers) and Circle Premium." />
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Platform fees collected" value={formatINR(r.feeTotal, { showPaise: true })} sub={`${r.feeCount} loans`} />
        <StatTile label="Premium MRR" value={formatINR(r.mrr)} sub={`${r.subs.length} circle${r.subs.length === 1 ? "" : "s"}`} />
      </div>
      <SectionTitle>Premium circles</SectionTitle>
      {r.subs.length === 0 ? <Notice>No circle has upgraded yet.</Notice> : <ul className="divide-y divide-line rounded-3xl border border-line bg-surface px-4">{r.subs.map((s) => <li key={s.circle} className="flex justify-between py-3 text-sm"><span>{s.circle}<span className="block text-xs text-muted">since {fmtDate(s.since)}</span></span><span className="num font-semibold">{formatINR(s.price)}/mo</span></li>)}</ul>}
      <SectionTitle>Recent fees</SectionTitle>
      <Card className="p-0"><ul className="divide-y divide-line px-4">{r.recentFees.map((f) => <li key={f.id} className="flex justify-between py-3 text-sm"><span>{f.circle}<span className="block text-xs text-muted">{fmtDate(f.createdAt)}</span></span><span className="num font-semibold">{formatINR(f.amount, { showPaise: true })}</span></li>)}</ul></Card>
      <p className="mt-3 text-xs text-muted">{r.ledgerCount} ledger entries across all circles.</p>
    </div>
  );
}
