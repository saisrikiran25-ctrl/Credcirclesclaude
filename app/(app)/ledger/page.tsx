import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Download, ScrollText } from "lucide-react";
import { requireCtx } from "@/lib/session";
import { schema } from "@/lib/db";
import { myCircles } from "@/lib/core/position";
import { LEDGER_META, LedgerRow } from "@/components/ledger-bits";
import { EmptyState, Notice, PageHeader } from "@/components/ui";
import { btnClass } from "@/components/ui";
import { cn } from "@/lib/utils";

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
  const chip = (on: boolean) => cn("inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold", on ? "bg-brand text-onbrand" : "bg-surface2 text-muted hover:text-fg");
  return (
    <div>
      <PageHeader title="Ledger" subtitle="Every rupee movement in your circles. Append-only: nothing is edited or deleted." action={<a href={`/ledger/export${qs({})}`} className={btnClass("ghost", "sm")}><Download size={16} aria-hidden="true" /> CSV</a>} />
      {circles.length > 1 && <nav aria-label="Filter by circle" className="-mx-4 mb-2 overflow-x-auto px-4"><ul className="flex gap-2"><li><Link href={`/ledger${qs({ circle: undefined })}`} className={chip(!sp.circle)}>All circles</Link></li>{circles.map((c) => <li key={c.id}><Link href={`/ledger${qs({ circle: c.id })}`} className={chip(sp.circle === c.id)}>{c.name}</Link></li>)}</ul></nav>}
      <nav aria-label="Filter by type" className="-mx-4 mb-4 overflow-x-auto px-4"><ul className="flex gap-2"><li><Link href={`/ledger${qs({ type: undefined })}`} className={chip(!type)}>All types</Link></li>{Object.entries(LEDGER_META).map(([k, m]) => <li key={k}><Link href={`/ledger${qs({ type: k })}`} className={chip(type === k)}>{m.label}</Link></li>)}</ul></nav>
      {rows.length === 0 ? <EmptyState icon={<ScrollText size={26} />} title="Nothing here yet" body="Contributions, loans and repayments will appear as they happen." /> : (
        <ul className="divide-y divide-line rounded-3xl border border-line bg-surface px-4">{rows.map((r) => <LedgerRow key={r.id} r={{ ...r, circleName: circleNames.get(r.circleId), actorName: names.get(r.actorId) }} />)}</ul>
      )}
      <Notice className="mt-4">Showing the latest {Math.min(rows.length, 200)} entries. The CSV has everything matching your filters.</Notice>
    </div>
  );
}
