import { and, asc, eq, inArray } from "drizzle-orm";
import { getCtx } from "@/lib/session";
import { schema } from "@/lib/db";
import { myCircles } from "@/lib/core/position";
import { LEDGER_META } from "@/components/ledger-bits";

export const dynamic = "force-dynamic";

const esc = (v: string | number | null) => {
  const s = v === null ? "" : String(v);
  // Neutralise spreadsheet formula injection as well as quoting.
  const safe = /^[=+\-@]/.test(s) && typeof v === "string" ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET(req: Request) {
  const { db, user } = await getCtx();
  if (!user) return new Response("Sign in first", { status: 401 });
  const url = new URL(req.url);
  const circleParam = url.searchParams.get("circle");
  const typeParam = url.searchParams.get("type");
  const circles = myCircles(db, user.id).filter((c) => !circleParam || c.id === circleParam);
  const ids = circles.map((c) => c.id);
  const type = typeParam && LEDGER_META[typeParam] ? typeParam : undefined;
  const rows = ids.length === 0 ? [] : db.select().from(schema.ledgerEntries)
    .where(type ? and(inArray(schema.ledgerEntries.circleId, ids), eq(schema.ledgerEntries.type, type)) : inArray(schema.ledgerEntries.circleId, ids))
    .orderBy(asc(schema.ledgerEntries.createdAt)).all();
  const names = new Map(db.select().from(schema.users).all().map((u) => [u.id, u.name]));
  const cn = new Map(circles.map((c) => [c.id, c.name]));
  const header = ["reference", "date_time_ist", "circle", "type", "status", "amount_inr", "actor", "loan_id", "memo"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      r.ref, new Date(r.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false }), cn.get(r.circleId) ?? "", r.type, r.status,
      (r.amount / 100).toFixed(2), names.get(r.actorId) ?? "", r.loanId ?? "", r.memo ?? "",
    ].map(esc).join(","));
  }
  return new Response(lines.join("\n") + "\n", {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="circlo-ledger.csv"', "cache-control": "no-store" },
  });
}
