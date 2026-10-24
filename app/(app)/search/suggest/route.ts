import { NextResponse } from "next/server";
import { getCtx } from "@/lib/session";
import { schema } from "@/lib/db";
import { myCircles, myLoans } from "@/lib/core/position";
import { activeMemberIds } from "@/lib/core/shared";
import { displayStatus } from "@/lib/core/loans";
import { formatINR } from "@/lib/domain/money";
import { purposeLabel } from "@/components/loan-bits";
import { PAGE_ITEMS, rank, type SearchItem } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { db, user } = await getCtx();
  if (!user) return NextResponse.json({ hits: [] }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80);
  if (!q.trim()) return NextResponse.json({ hits: PAGE_ITEMS.slice(0, 6).map((p) => ({ ...p, score: 0 })) });

  const circles = myCircles(db, user.id);
  const loans = myLoans(db, user.id);
  const users = new Map(db.select().from(schema.users).all().map((u) => [u.id, u]));
  const peopleIds = new Set(circles.flatMap((c) => activeMemberIds(db, c.id)));
  const items: SearchItem[] = [
    ...circles.map((c): SearchItem => ({ kind: "circle", id: c.id, href: `/circles/${c.id}`, title: c.name, sub: `${c.memberCount} members · ${c.city}`, keywords: `${c.type} circle group` })),
    ...loans.map((l): SearchItem => {
      const amt = formatINR(l.loan.amount);
      return { kind: "loan", id: l.loan.id, href: `/loans/${l.loan.id}`, title: `${amt} · ${l.mine ? "Your loan" : l.borrowerName}`, sub: `${purposeLabel(l.loan.purpose)} · ${l.circleName}`, keywords: `${l.borrowerName} ${l.loan.note ?? ""} ${displayStatus(l.loan, false)} loan ${l.loan.amount / 100}` };
    }),
    ...[...peopleIds].flatMap((id) => {
      const u = users.get(id);
      return u ? [{ kind: "person" as const, id: u.id, href: u.id === user.id ? "/risk" : `/risk?user=${u.id}`, title: u.id === user.id ? `${u.name} (you)` : u.name, sub: "Person in your circles · risk score", keywords: "member friend" }] : [];
    }),
    ...PAGE_ITEMS,
  ];
  return NextResponse.json({ hits: rank(items, q) });
}
