import Link from "next/link";
import { Search } from "lucide-react";
import { requireCtx } from "@/lib/session";
import { schema } from "@/lib/db";
import { myCircles, myLoans } from "@/lib/core/position";
import { activeMemberIds } from "@/lib/core/shared";
import { displayStatus } from "@/lib/core/loans";
import { formatINR } from "@/lib/domain/money";
import { SearchBox } from "@/components/client/search-box";
import { Avatar, Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { StatusBadge, purposeLabel } from "@/components/loan-bits";

export const metadata = { title: "Search" };

const PAGES = [
  { href: "/position", label: "My position", hint: "Lent, borrowed and earnings" },
  { href: "/ledger", label: "Ledger", hint: "Every rupee movement, CSV export" },
  { href: "/risk", label: "Risk score", hint: "How your score is built" },
  { href: "/contribute", label: "Contribute", hint: "Add to a circle's pool" },
  { href: "/loans/new", label: "Request a loan", hint: "Ask your circle" },
  { href: "/learn/how-circles-work", label: "How circles work", hint: "Explainer" },
];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { db, user } = await requireCtx();
  const q = ((await searchParams).q ?? "").trim().toLowerCase();
  const circles = myCircles(db, user.id);
  const loans = myLoans(db, user.id);
  const users = new Map(db.select().from(schema.users).all().map((u) => [u.id, u]));
  const peopleIds = new Set(circles.flatMap((c) => activeMemberIds(db, c.id)));
  const match = (s: string) => !q || s.toLowerCase().includes(q);
  const cHits = circles.filter((c) => match(`${c.name} ${c.city} ${c.type}`));
  const lHits = loans.filter((l) => q && match(`${l.borrowerName} ${l.circleName} ${purposeLabel(l.loan.purpose)} ${l.loan.note ?? ""}`));
  const pHits = [...peopleIds].map((id) => users.get(id)!).filter((u) => q && match(u.name));
  const gHits = PAGES.filter((p) => match(`${p.label} ${p.hint}`));
  const none = cHits.length + lHits.length + pHits.length + gHits.length === 0;
  return (
    <div>
      <PageHeader title="Search" />
      <div className="mb-5"><SearchBox variant="page" initial={q} /></div>
      {none && <EmptyState icon={<Search size={24} />} title="Nothing found" body="Try a circle name, a person, or a purpose like “education”." />}
      {cHits.length > 0 && (<><SectionTitle>Circles</SectionTitle><Card className="divide-y divide-line p-0 md:p-0">{cHits.map((c) => <Link key={c.id} href={`/circles/${c.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 hover:bg-surface2"><span className="font-medium">{c.name}</span><span className="text-xs text-muted">{c.memberCount} members · {c.city}</span></Link>)}</Card></>)}
      {lHits.length > 0 && (<><SectionTitle>Loans</SectionTitle><Card className="divide-y divide-line p-0 md:p-0">{lHits.map((l) => <Link key={l.loan.id} href={`/loans/${l.loan.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 hover:bg-surface2"><span><span className="font-medium">{l.mine ? "You" : l.borrowerName}</span><span className="block text-xs text-muted">{purposeLabel(l.loan.purpose)} · {l.circleName}</span></span><span className="flex items-center gap-2"><span className="num font-medium">{formatINR(l.loan.amount)}</span><StatusBadge status={displayStatus(l.loan, false)} /></span></Link>)}</Card></>)}
      {pHits.length > 0 && (<><SectionTitle>People in your circles</SectionTitle><Card className="divide-y divide-line p-0 md:p-0">{pHits.map((p) => <Link key={p.id} href={p.id === user.id ? "/risk" : `/risk?user=${p.id}`} className="flex min-h-14 items-center gap-3 px-4 hover:bg-surface2"><Avatar name={p.name} size={36} /><span className="font-medium">{p.name}</span><span className="ml-auto text-xs text-muted">View risk score</span></Link>)}</Card></>)}
      {gHits.length > 0 && (<><SectionTitle>{q ? "Pages" : "Quick links"}</SectionTitle><Card className="divide-y divide-line p-0 md:p-0">{gHits.map((p) => <Link key={p.href} href={p.href} className="flex min-h-14 items-center justify-between gap-3 px-4 hover:bg-surface2"><span className="font-medium">{p.label}</span><span className="text-xs text-muted">{p.hint}</span></Link>)}</Card></>)}
    </div>
  );
}
