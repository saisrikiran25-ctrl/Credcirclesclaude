import Link from "next/link";
import { KeyRound, Plus, Users } from "lucide-react";
import { requireCtx } from "@/lib/session";
import { myCircles } from "@/lib/core/position";
import { circleStats } from "@/lib/core/stats";
import { formatINR } from "@/lib/domain/money";
import { Badge, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { RingGauge } from "@/components/client/ring";

export const metadata = { title: "Circles" };

export default async function CirclesPage() {
  const { db, user, now } = await requireCtx();
  const circles = myCircles(db, user.id);
  return (
    <div>
      <PageHeader title="Your circles" subtitle="Small, invite-only groups of verified people you trust." action={<LinkButton href="/circles/new" size="sm"><Plus size={16} aria-hidden="true" /> New</LinkButton>} />
      {circles.length === 0 ? (
        <EmptyState icon={<Users size={26} />} title="No circles yet" body="Start one with friends, or join with a code someone shared." action={<div className="flex gap-2"><LinkButton href="/circles/new">Create a circle</LinkButton><LinkButton href="/join" variant="ghost">Join with code</LinkButton></div>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {circles.map((c) => {
            const s = circleStats(db, c.id, now);
            return (
              <Link key={c.id} href={`/circles/${c.id}`} className="rounded-3xl border border-line bg-surface p-4 transition hover:border-brand">
                <div className="flex items-center gap-4">
                  <RingGauge size={84} thickness={11} ariaLabel={`${formatINR(s.totals.outstanding)} lent out, ${formatINR(s.totals.pool)} available`} segments={[{ value: s.totals.outstanding, color: "var(--accent)", label: "Lent" }, { value: s.totals.pool, color: "var(--brand)", label: "Available" }]} />
                  <div className="min-w-0">
                    <div className="truncate font-display font-semibold">{c.name}</div>
                    <div className="text-xs text-muted">{c.memberCount} members · {c.city}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {c.role === "admin" && <Badge tone="brand">Admin</Badge>}
                      <Badge tone={c.complianceMode === "A" ? "neutral" : "warn"}>{c.complianceMode === "A" ? "Partnered" : "Closed"}</Badge>
                      {c.premium && <Badge tone="accent">Premium</Badge>}
                    </div>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div><dt className="text-muted">Available</dt><dd className="num font-semibold">{formatINR(s.totals.pool)}</dd></div>
                  <div><dt className="text-muted">Lent out</dt><dd className="num font-semibold">{formatINR(s.totals.outstanding)}</dd></div>
                  <div><dt className="text-muted">On-time</dt><dd className="num font-semibold">{s.onTimeRate === null ? "n/a" : `${Math.round(s.onTimeRate)}%`}</dd></div>
                </dl>
              </Link>
            );
          })}
        </div>
      )}
      <Link href="/join" className="mt-5 flex min-h-14 items-center gap-3 rounded-2xl border border-dashed border-line px-4 text-sm font-semibold text-muted hover:border-brand hover:text-fg"><KeyRound size={18} aria-hidden="true" /> Have an invite code? Join a circle</Link>
    </div>
  );
}
