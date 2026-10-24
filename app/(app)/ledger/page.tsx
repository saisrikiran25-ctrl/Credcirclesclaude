import { and, desc, eq, inArray } from "drizzle-orm";
import { Download, ScrollText } from "lucide-react";
import { requireCtx } from "@/lib/session";
import { schema } from "@/lib/db";
import { myCircles } from "@/lib/core/position";
import { LEDGER_META, LedgerRow } from "@/components/ledger-bits";
import { formatINR } from "@/lib/domain/money";
import { fmtDateTime } from "@/lib/utils";
import { ChipLinks, EmptyState, Notice, PageHeader, btnClass } from "@/components/ui";

export const metadata = { title: "Ledger" };

export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ circle?: string; type?: string }> }) {
  const { db, user } = await requireCtx();
  const sp = await searchParams;
  const circles = myCircles(db, user.id);
  const ids = circles.filter((c) => !sp.circle || c.id === sp.circle).map((c) => c.id);
  const type = sp.type && LEDGER_META[sp.type] ? sp.type : undefined;
  const rows = ids.length === 0 ? [] : db.select().from(schema.ledgerEntries)
    .where(type ? and(inArray(schema.ledgerEntries.circleId, ids), eq(schema.ledgerEntries.type, type)) : inArray(schema.ledgerEntries.circleId, ids))
    .orderBy(desc(schema.ledgerEntries.createdAt)).limit(200).all();
  const names = new Map(db.select().from(schema.users).all().map((u) => [u.id, u.name]));
  const circleNames = new Map(circles.map((c) => [c.id, c.name]));
  const qs = (o: Record<string, string | undefined>) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries({ circle: sp.circle, type: sp.type, ...o })) if (v) p.set(k, v); const s = p.toString(); return s ? `?${s}` : ""; };
  return (
    <div>
      <PageHeader title="Ledger" subtitle="Every rupee movement in your circles. Append-only: nothing is edited or deleted." action={<a href={`/ledger/export${qs({})}`} className={btnClass("ghost", "sm")}><Download size={16} aria-hidden="true" /> CSV</a>} />
      {circles.length > 1 && <ChipLinks label="Filter by circle" items={[{ href: `/ledger${qs({ circle: undefined })}`, label: "All circles", active: !sp.circle }, ...circles.map((c) => ({ href: `/ledger${qs({ circle: c.id })}`, label: c.name, active: sp.circle === c.id }))]} />}
      <ChipLinks label="Filter by type" items={[{ href: `/ledger${qs({ type: undefined })}`, label: "All types", active: !type }, ...Object.entries(LEDGER_META).map(([k, m]) => ({ href: `/ledger${qs({ type: k })}`, label: m.label, active: type === k }))]} />
      {rows.length === 0 ? <EmptyState icon={<ScrollText size={26} />} title="Nothing here yet" body="Contributions, loans and repayments will appear as they happen." /> : (
        <>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface px-4 md:hidden">{rows.map((r) => <LedgerRow key={r.id} r={{ ...r, circleName: circleNames.get(r.circleId), actorName: names.get(r.actorId) }} />)}</ul>
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Ledger entries</caption>
              <thead><tr className="border-b border-line bg-surface2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted"><th scope="col" className="px-4 py-2">Date</th><th scope="col" className="px-4 py-2">Reference</th><th scope="col" className="px-4 py-2">Type</th><th scope="col" className="px-4 py-2">Circle</th><th scope="col" className="px-4 py-2">By</th><th scope="col" className="px-4 py-2 text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-line">{rows.map((r) => {
                const m = LEDGER_META[r.type];
                const failed = r.status === "failed";
                return (
                  <tr key={r.id} className="hover:bg-surface2">
                    <td className="whitespace-nowrap px-4 py-2 text-muted">{fmtDateTime(r.createdAt)}</td>
                    <td className="num px-4 py-2 text-xs text-muted">{r.ref}</td>
                    <td className="px-4 py-2 font-medium">{m?.label ?? r.type}{failed && <span className="ml-2 rounded bg-negsoft px-1.5 py-0.5 text-[10px] font-semibold text-neg">Failed</span>}{r.memo && <span className="block text-xs font-normal text-muted">{r.memo}</span>}</td>
                    <td className="px-4 py-2">{circleNames.get(r.circleId)}</td>
                    <td className="px-4 py-2">{names.get(r.actorId)}</td>
                    <td className={`num whitespace-nowrap px-4 py-2 text-right font-semibold ${failed ? "text-muted line-through" : (m?.sign ?? 0) > 0 ? "text-pos" : ""}`}>{(m?.sign ?? 0) > 0 ? "+" : (m?.sign ?? 0) < 0 ? "-" : ""}{formatINR(r.amount, { showPaise: true })}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </>
      )}
      <p className="mt-3 text-xs text-muted">Showing the latest {Math.min(rows.length, 200)} entries. The CSV has everything matching your filters.</p>
    </div>
  );
}
