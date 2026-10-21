import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Crown, Lock, Sparkles } from "lucide-react";
import { requireCtx } from "@/lib/session";
import { schema } from "@/lib/db";
import { getMembership, activeMemberIds } from "@/lib/core/shared";
import { circleInviteCode } from "@/lib/core/circles";
import { circleNudges, circleStats, memberCapacity, memberContributionTotals, portfolioSeries, recentLedger, riskForUser } from "@/lib/core/stats";
import { displayStatus } from "@/lib/core/loans";
import { formatINR } from "@/lib/domain/money";
import { RISK_DISCLOSURE } from "@/lib/domain/constants";
import { instalmentStatus } from "@/lib/domain/emi";
import { Avatar, Badge, Card, LinkButton, Notice, PageHeader, RiskBadge, SectionTitle, StatTile } from "@/components/ui";
import { MemberRing, RingGauge } from "@/components/client/ring";
import { PerformanceChart } from "@/components/charts/performance-chart";
import { ComplianceToggle, InvitePanel, PremiumPanel, RemoveMemberButton, RulesEditor } from "@/components/client/circle-admin";
import { LoanListItem } from "@/components/loan-bits";
import { LedgerRow } from "@/components/ledger-bits";
import { cn } from "@/lib/utils";

const { circles, loans, users, instalments, premiumSubscriptions } = schema;

const TABS = [
  ["overview", "Overview"], ["members", "Members"], ["loans", "Loans"], ["ledger", "Ledger"], ["rules", "Rules"], ["performance", "Performance"], ["invite", "Invite"],
] as const;

export async function generateMetadata() { return { title: "Circle" }; }

export default async function CirclePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; created?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = TABS.some(([t]) => t === sp.tab) ? sp.tab! : "overview";
  const { db, user, now } = await requireCtx();
  const circle = db.select().from(circles).where(eq(circles.id, id)).get();
  if (!circle) notFound();
  const me = getMembership(db, id, user.id);
  if (!me) return (
    <div><PageHeader back="/circles" title={circle.name} />
      <Notice tone="warn" title="Members only">This circle is invite-only. Ask the admin for the invite code to see inside.</Notice>
      <div className="mt-4"><LinkButton href="/join">Enter an invite code</LinkButton></div></div>
  );
  const isAdmin = me.role === "admin";
  const stats = circleStats(db, id, now);
  const memberIds = activeMemberIds(db, id);
  const userRows = new Map(db.select().from(users).all().map((u) => [u.id, u]));
  const contributed = memberContributionTotals(db, id);
  const capacity = memberCapacity(db, id);
  const t = stats.totals;
  const capital = t.pool + t.outstanding;

  return (
    <div>
      <PageHeader back="/circles" title={circle.name} subtitle={`${circle.city} · ${memberIds.length} members${circle.description ? ` · ${circle.description}` : ""}`}
        action={<div className="flex flex-col items-end gap-1.5">{isAdmin && <Badge tone="brand"><Crown size={12} aria-hidden="true" /> Admin</Badge>}<Badge tone={circle.complianceMode === "A" ? "neutral" : "warn"}>{circle.complianceMode === "A" ? "Partnered" : "Closed"}</Badge></div>} />
      {sp.created && <Notice tone="pos" title="Circle created" className="mb-4">Share the invite code below with people you trust. They must be verified to join.</Notice>}
      <nav aria-label="Circle sections" className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          {TABS.map(([k, label]) => (
            <li key={k}><Link href={`/circles/${id}?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={cn("inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold", tab === k ? "bg-brand text-onbrand" : "bg-surface2 text-muted hover:text-fg")}>{label}</Link></li>
          ))}
        </ul>
      </nav>

      {tab === "overview" && (() => {
        const nudges = circleNudges(db, id, now);
        const open = db.select().from(loans).where(eq(loans.circleId, id)).all().filter((l) => ["voting", "approved"].includes(l.status));
        return (
          <div className="space-y-5">
            <Card className="relative overflow-hidden">
              <h2 className="font-display text-lg font-semibold">Circle position</h2>
              <p className="text-sm text-muted">Where the group's money is right now. It stays in members' own bank accounts.</p>
              <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
                <RingGauge size={200} thickness={22} ariaLabel={`Circle capital ${formatINR(capital)}: ${formatINR(t.outstanding)} lent out, ${formatINR(t.pool)} available`}
                  segments={[{ value: t.outstanding, color: "var(--accent)", label: "Lent out" }, { value: Math.max(t.pool, 0), color: "var(--brand)", label: "Available" }]}
                  center={<div><div className="text-xs text-muted">Total capital</div><div className="num font-display text-2xl font-bold">{formatINR(capital)}</div></div>} />
                <dl className="grid w-full flex-1 grid-cols-2 gap-3">
                  <StatTile label="Available to lend" value={formatINR(t.pool)} />
                  <StatTile label="Lent out" value={formatINR(t.outstanding)} sub={`${stats.activeLoans} active loan${stats.activeLoans === 1 ? "" : "s"}`} />
                  <StatTile label="On-time repayment" value={stats.onTimeRate === null ? "n/a" : `${Math.round(stats.onTimeRate)}%`} tone={stats.onTimeRate !== null && stats.onTimeRate < 80 ? "warn" : "pos"} />
                  <StatTile label="Overdue" value={formatINR(stats.overdueAmount)} sub={stats.overdueCount ? `${stats.overdueCount} instalment${stats.overdueCount === 1 ? "" : "s"}` : "None"} tone={stats.overdueCount ? "neg" : undefined} />
                </dl>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full bg-accent" aria-hidden="true" /> Lent out</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full bg-brand" aria-hidden="true" /> Available</span>
              </div>
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <LinkButton href={`/contribute?circle=${id}`} variant="accent" size="lg">Contribute</LinkButton>
              <LinkButton href={`/loans/new?circle=${id}`} variant="primary" size="lg">Request a loan</LinkButton>
            </div>
            {nudges.map((n) => <Notice key={n.id} tone={n.severity === "warn" ? "warn" : "info"} title={n.title}>{n.body}</Notice>)}
            <Card>
              <h2 className="mb-4 text-center font-display text-lg font-semibold">Who is in the circle</h2>
              <MemberRing members={memberIds.map((m) => ({ name: userRows.get(m)?.name ?? "Member", admin: m === circle.creatorId }))}
                center={<div><div className="num font-display text-3xl font-bold">{memberIds.length}</div><div className="text-xs text-muted">verified members</div></div>} />
            </Card>
            {open.length > 0 && (<><SectionTitle>In progress</SectionTitle><div className="space-y-3">
              {open.map((l) => <LoanListItem key={l.id} href={`/loans/${l.id}`} borrowerName={userRows.get(l.borrowerId)?.name ?? "Member"} circleName={circle.name} amount={l.amount} purpose={l.purpose} status={displayStatus(l, false)} />)}
            </div></>)}
            <Notice tone="warn" title="Risk">{RISK_DISCLOSURE}</Notice>
          </div>
        );
      })()}

      {tab === "members" && (
        <ul className="divide-y divide-line rounded-3xl border border-line bg-surface px-4">
          {memberIds.map((m) => {
            const u = userRows.get(m)!;
            const risk = riskForUser(db, m, now);
            return (
              <li key={m} className="flex items-center gap-3 py-3.5">
                <Avatar name={u.name} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{u.name}</span>{m === circle.creatorId && <Badge tone="brand">Admin</Badge>}{u.kycStatus === "verified" && <Badge tone="pos">Verified</Badge>}</div>
                  <div className="num text-xs text-muted">Contributed {formatINR(contributed.get(m) ?? 0)} · can lend {formatINR(Math.max(capacity.get(m) ?? 0, 0))}</div>
                  <div className="mt-1"><RiskBadge band={risk.band} score={risk.score} /></div>
                </div>
                {isAdmin && m !== user.id && m !== circle.creatorId && <RemoveMemberButton circleId={id} memberId={m} name={u.name} />}
              </li>
            );
          })}
        </ul>
      )}

      {tab === "loans" && (() => {
        const list = db.select().from(loans).where(eq(loans.circleId, id)).all().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        if (list.length === 0) return <Notice>No loan requests yet.</Notice>;
        return <div className="space-y-3">{list.map((l) => {
          const overdue = l.status === "repaying" && db.select().from(instalments).where(and(eq(instalments.loanId, l.id), eq(instalments.state, "active"))).all().some((i) => !i.paidAt && instalmentStatus(i.dueDate, now, false) === "overdue");
          return <LoanListItem key={l.id} href={`/loans/${l.id}`} borrowerName={userRows.get(l.borrowerId)?.name ?? "Member"} circleName={circle.name} amount={l.amount} purpose={l.purpose} status={displayStatus(l, overdue)} />;
        })}</div>;
      })()}

      {tab === "ledger" && (
        <Card>
          <div className="mb-1 flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Recent activity</h2><Link href={`/ledger?circle=${id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand">Full ledger and CSV</Link></div>
          <p className="mb-2 text-xs text-muted">Append-only: entries are never edited or deleted. Mistakes are corrected with a reversal entry.</p>
          <ul className="divide-y divide-line">{recentLedger(db, id, 25).map((r) => <LedgerRow key={r.id} r={{ ...r, actorName: userRows.get(r.actorId)?.name }} />)}</ul>
        </Card>
      )}

      {tab === "rules" && (
        <div className="space-y-5">
          <Card>
            <h2 className="mb-3 font-display text-lg font-semibold">Circle rules</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div><dt className="text-muted">Max loan</dt><dd className="num font-semibold">{formatINR(circle.maxLoan)}</dd></div>
              <div><dt className="text-muted">Interest</dt><dd className="num font-semibold">{circle.interestPct}% a year, simple</dd></div>
              <div><dt className="text-muted">Approval needed</dt><dd className="num font-semibold">{circle.approvalThresholdPct}% of members</dd></div>
              <div><dt className="text-muted">Late penalty</dt><dd className="num font-semibold">{circle.latePenaltyType === "flat" ? formatINR(circle.latePenaltyValue) : `${circle.latePenaltyValue}% of instalment`}</dd></div>
              <div><dt className="text-muted">Voting window</dt><dd className="num font-semibold">{circle.votingWindowHours} hours</dd></div>
              <div><dt className="text-muted">Platform fee</dt><dd className="num font-semibold">1.5% of principal, paid by borrower</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted">Each loan keeps the rules in force when it was requested.</p>
          </Card>
          {isAdmin ? (
            <>
              <Card><h2 className="mb-3 font-display text-lg font-semibold">Edit rules (admin)</h2><RulesEditor circleId={id} circle={circle} /></Card>
              <Card><h2 className="mb-1 font-display text-lg font-semibold">Compliance mode</h2><p className="mb-3 text-sm text-muted">Decides who can borrow and how funds are routed.</p><ComplianceToggle circleId={id} mode={circle.complianceMode as "A" | "C"} /></Card>
            </>
          ) : <Notice><Lock size={14} className="mr-1 inline" aria-hidden="true" />Only the circle admin can change rules.</Notice>}
        </div>
      )}

      {tab === "performance" && (() => {
        const series = portfolioSeries(db, id, now);
        const sub = db.select().from(premiumSubscriptions).where(and(eq(premiumSubscriptions.circleId, id), eq(premiumSubscriptions.active, true))).get();
        return (
          <div className="space-y-5">
            <Card>
              <h2 className="font-display text-lg font-semibold">Capital over time</h2>
              {series.length ? <PerformanceChart data={series} /> : <p className="text-sm text-muted">Nothing to chart yet.</p>}
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Annualised yield" value={`${stats.yieldPct.toFixed(1)}%`} sub="Interest and penalties on money out" />
              <StatTile label="Interest earned" value={formatINR(t.interestEarned, { showPaise: true })} />
              <StatTile label="Penalties" value={formatINR(t.penalties, { showPaise: true })} />
              <StatTile label="Written off" value={formatINR(t.writtenOff)} tone={t.writtenOff ? "neg" : undefined} />
            </div>
            {circle.premium ? (
              <Card>
                <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold"><Sparkles size={18} className="text-accent" aria-hidden="true" /> Premium analytics</h2>
                <p className="mb-3 text-sm text-muted">Exposure by borrower, ranked.</p>
                {stats.exposureByBorrower.length === 0 ? <p className="text-sm text-muted">No money is out right now.</p> : (
                  <ul className="space-y-2">{stats.exposureByBorrower.map((b) => (
                    <li key={b.borrowerId} className="flex items-center justify-between text-sm"><span>{b.name}</span><span className="num font-semibold">{formatINR(b.amount)} <span className="font-normal text-muted">({t.outstanding ? Math.round((b.amount / t.outstanding) * 100) : 0}% of lent)</span></span></li>
                  ))}</ul>
                )}
                {sub && <p className="mt-3 text-xs text-muted">Premium: {formatINR(sub.pricePerMonth)}/month.</p>}
              </Card>
            ) : (
              <Notice title="Circle Premium">Deeper analytics, bulk reminders and priority support for ₹50 to ₹200 a month. {isAdmin ? "Turn it on below." : "Ask your admin."}</Notice>
            )}
            {isAdmin && <Card><h2 className="mb-3 font-display text-lg font-semibold">Circle Premium</h2><PremiumPanel circleId={id} active={circle.premium} price={sub?.pricePerMonth ?? null} /></Card>}
          </div>
        );
      })()}

      {tab === "invite" && (
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Invite people</h2>
          {isAdmin
            ? <InvitePanel circleId={id} code={circleInviteCode(db, id)} origin={await originOf()} />
            : <Notice>Only the admin can create invite links. Ask {userRows.get(circle.creatorId)?.name ?? "the admin"} to share the code.</Notice>}
        </Card>
      )}
    </div>
  );
}

async function originOf() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
