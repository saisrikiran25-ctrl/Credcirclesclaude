import { eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { requireCtx } from "@/lib/session";
import { myCircles } from "@/lib/core/position";
import { requestContext } from "@/lib/core/loans";
import { formatINR } from "@/lib/domain/money";
import { RISK_DISCLOSURE } from "@/lib/domain/constants";
import { Card, EmptyState, LinkButton, Notice, PageHeader, RiskBadge, StatTile } from "@/components/ui";
import { LoanRequestForm } from "@/components/client/loan-request-form";
import { HandCoins } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Request a loan" };

export default async function NewLoan({ searchParams }: { searchParams: Promise<{ circle?: string }> }) {
  const { db, user, now } = await requireCtx();
  const sp = await searchParams;
  const circles = myCircles(db, user.id);
  // Outside borrowers (Compliance Mode A) arrive from a circle's invite preview with ?circle=<id>.
  const outside = sp.circle && !circles.some((c) => c.id === sp.circle) ? db.select().from(schema.circles).where(eq(schema.circles.id, sp.circle)).get() : undefined;
  if (circles.length === 0 && !outside) return (
    <div><PageHeader back="/home" title="Request a loan" />
      <EmptyState icon={<HandCoins size={26} />} title="Join a circle first" body="Loans are requested from, and voted on by, a circle you belong to." action={<LinkButton href="/circles/new">Create a circle</LinkButton>} /></div>
  );
  const circleId = outside?.id ?? circles.find((c) => c.id === sp.circle)?.id ?? circles[0].id;
  const ctx = requestContext(db, user.id, circleId, now);
  return (
    <div>
      <PageHeader back="/loans" title="Request a loan" subtitle={ctx.circle.name} />
      {circles.length > 1 && (
        <nav aria-label="Choose circle" className="-mx-4 mb-4 overflow-x-auto px-4"><ul className="flex gap-2">{circles.map((c) => (
          <li key={c.id}><Link href={`/loans/new?circle=${c.id}`} aria-current={c.id === circleId ? "page" : undefined} className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold ${c.id === circleId ? "bg-brand text-onbrand" : "bg-surface2 text-muted"}`}>{c.name}</Link></li>
        ))}</ul></nav>
      )}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <StatTile label="Available in the pool" value={formatINR(Math.max(ctx.pool - ctx.committed, 0))} />
        <StatTile label="Recommended up to" value={formatINR(ctx.recommendedMax)} sub="so no one loan dominates" />
      </div>
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div><div className="text-sm font-semibold">Your risk score</div><p className="text-xs text-muted">Shown to members when they vote. <Link href="/risk" className="font-semibold text-brand underline">How it works</Link></p></div>
        <RiskBadge band={ctx.risk.band} score={ctx.risk.score} />
      </Card>
      {ctx.isExternal && !ctx.blocked && <Notice tone="info" title="Outside borrower" className="mb-4">You are not a member, so every member of the circle will vote on your request.</Notice>}
      {ctx.blocked ? <Notice tone="warn" title="You cannot borrow here right now">{ctx.blocked}</Notice> : (
        <>
          {ctx.nudges.map((n) => <Notice key={n.id} tone={n.severity === "warn" ? "warn" : "info"} title={n.title} className="mb-3">{n.body}</Notice>)}
          <Card><LoanRequestForm circleId={circleId} interestPct={ctx.circle.interestPct} maxAmount={ctx.maxAmount} recommendedMax={ctx.recommendedMax} /></Card>
          <p className="mt-4 text-xs text-muted">{RISK_DISCLOSURE} Your money stays in your bank account; lenders pay you directly by UPI once members approve.</p>
        </>
      )}
    </div>
  );
}
