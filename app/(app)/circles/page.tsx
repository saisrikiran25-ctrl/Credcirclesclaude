import Link from "next/link";
import { KeyRound, Plus, Users } from "lucide-react";
import { requireCtx } from "@/lib/session";
import { myCircles } from "@/lib/core/position";
import { circleStats, portfolioSeries } from "@/lib/core/stats";
import { formatINR } from "@/lib/domain/money";
import { Badge, CircleIcon, Card, EmptyState, LinkButton, PageHeader, Sparkline } from "@/components/ui";

export const metadata = { title: "Circles" };

export default async function CirclesPage() {
  const { db, user, now } = await requireCtx();
  const circles = myCircles(db, user.id);
  return (
    <div>
      <PageHeader title="Circles" subtitle="Small, invite-only groups of verified people you trust." action={<div className="flex gap-2"><LinkButton href="/join" size="sm" variant="ghost" className="max-sm:hidden"><KeyRound size={16} aria-hidden="true" /> Join</LinkButton><LinkButton href="/circles/new" size="sm"><Plus size={16} aria-hidden="true" /> New</LinkButton></div>} />
      {circles.length === 0 ? (
        <EmptyState icon={<Users size={26} />} title="No circles yet" body="Start one with friends, or join with a code someone shared." action={<div className="flex gap-2"><LinkButton href="/circles/new">Create a circle</LinkButton><LinkButton href="/join" variant="ghost">Join with code</LinkButton></div>} />
      ) : (
        <Card className="overflow-hidden p-0 md:p-0">
          <div className="hidden grid-cols-[2.2fr_1fr_1fr_1fr_1fr_80px] gap-4 border-b border-line bg-surface2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted md:grid">
            <span>Circle</span><span className="text-right">Members</span><span className="text-right">Available</span><span className="text-right">Lent out</span><span className="text-right">On time</span><span className="text-right">Trend</span>
          </div>
          <ul className="divide-y divide-line">
            {circles.map((c) => {
              const s = circleStats(db, c.id, now);
              const series = portfolioSeries(db, c.id, now, 14).map((p) => p.pool);
              return (
                <li key={c.id}>
                  <Link href={`/circles/${c.id}`} className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 transition hover:bg-surface2 md:grid-cols-[2.2fr_1fr_1fr_1fr_1fr_80px] md:py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <CircleIcon name={c.name} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{c.name}</div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">{c.city}
                          {c.role === "admin" && <Badge tone="brand">Admin</Badge>}
                          <Badge tone={c.complianceMode === "A" ? "neutral" : "warn"}>{c.complianceMode === "A" ? "Partnered" : "Closed"}</Badge>
                          {c.premium && <Badge tone="accent">Premium</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="num text-right md:hidden"><div className="font-semibold">{formatINR(s.totals.pool + s.totals.outstanding)}</div><div className="text-xs text-muted">{c.memberCount} members</div></div>
                    <span className="num hidden text-right md:block">{c.memberCount}</span>
                    <span className="num hidden text-right font-medium md:block">{formatINR(s.totals.pool)}</span>
                    <span className="num hidden text-right md:block">{formatINR(s.totals.outstanding)}</span>
                    <span className={`num hidden text-right font-medium md:block ${s.overdueCount ? "text-neg" : ""}`}>{s.overdueCount ? `${s.overdueCount} overdue` : s.onTimeRate === null ? "n/a" : `${Math.round(s.onTimeRate)}%`}</span>
                    <span className="hidden justify-end md:flex"><Sparkline values={series} up={s.overdueCount === 0} /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <Link href="/join" className="mt-4 flex min-h-12 items-center gap-3 rounded-xl border border-dashed border-line px-4 text-sm font-medium text-muted hover:border-brand hover:text-fg md:hidden"><KeyRound size={18} aria-hidden="true" /> Have an invite code? Join a circle</Link>
    </div>
  );
}
