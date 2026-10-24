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
import { Avatar, Badge, CircleIcon, Card, Delta, KeyValue, LinkButton, Notice, PageHeader, RiskBadge, SectionTitle, StatTile, Tabs } from "@/components/ui";
import { RingGauge } from "@/components/client/ring";
import { PerformanceChart } from "@/components/charts/performance-chart";
import { ComplianceToggle, InvitePanel, PremiumPanel, RemoveMemberButton, RulesEditor } from "@/components/client/circle-admin";
import { LoanListItem } from "@/components/loan-bits";
import { LedgerRow } from "@/components/ledger-bits";

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

  const mine = contributed.get(user.id) ?? 0;
  const series = portfolioSeries(db, id, now);
  const actionPanel = (
    <Card className="space-y-4">
      <div>
        <div className="text-xs font-medium text-muted">Available to lend</div>
        <div className="num text-2xl font-semibold tracking-tight">{formatINR(Math.max(t.pool, 0))}</div>
      </div>
      <KeyValue rows={[
        { k: "Your contributions", v: formatINR(mine) },
        { k: "You can lend", v: formatINR(Math.max(capacity.get(user.id) ?? 0, 0)) },
        { k: "Max loan per member", v: formatINR(circle.maxLoan) },
        { k: "Interest", v: `${circle.interestPct}% a year` },
      ]} />
      <div className="grid gap-2 max-md:hidden">
        <LinkButton href={`/loans/new?circle=${id}`} variant="primary" full>Request a loan</LinkButton>
        <LinkButton href={`/contribute?circle=${id}`} variant="soft" full>Contribute</LinkButton>
      </div>
    </Card>
  );

  return (
    <div>
      <PageHeader back="/circles" title={<span className="flex items-center gap-3"><CircleIcon name={circle.name} size={40} />{circle.name}</span>} subtitle={`${circle.city} · ${memberIds.length} members${circle.description ? ` · ${circle.description}` : ""}`}
        action={<div className="flex flex-wrap justify-end gap-1.5">{isAdmin && <Badge tone="brand"><Crown size={12} aria-hidden="true" /> Admin</Badge>}<Badge tone={circle.complianceMode === "A" ? "neutral" : "warn"}>{circle.complianceMode === "A" ? "Partnered" : "Closed"}</Badge></div>} />
      {sp.created && <Notice tone="pos" title="Circle created" className="mb-4">Share the invite code below with people you trust. They must be verified to join.</Notice>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-1">
            <div className="text-xs font-medium text-muted">Total capital</div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="num text-3xl font-semibold tracking-tight">{formatINR(capital)}</span>
              <Delta pct={stats.yieldPct} /><span className="text-xs text-muted">annualised yield</span>
            </div>
          </div>
          {series.length > 0 && <div className="-mx-1 mb-2"><PerformanceChart data={series} /></div>}
          <div className="mb-3 flex items-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[var(--green)]" aria-hidden="true" /> Total capital</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-accent" aria-hidden="true" /> Lent out</span>
          </div>

          <Tabs label="Circle sections" items={TABS.map(([k, label]) => ({ href: `/circles/${id}?tab=${k}`, label, active: tab === k }))} />

      {tab === "overview" && (() => {
        const nudges = circleNudges(db, id, now);
        const open = db.select().from(loans).where(eq(loans.circleId, id)).all().filter((l) => ["voting", "approved"].includes(l.status));
        return (
          <div className="space-y-5">
            <Card>
              <h2 className="mb-1 text-base font-semibold">Circle position</h2>
              <p className="mb-4 text-sm text-muted">Where the group's money is right now. It stays in members' own bank accounts.</p>
              <div className="flex flex-col items-center gap-5 sm:flex-row">
                <RingGauge size={150} thickness={18} ariaLabel={`Circle capital ${formatINR(capital)}: ${formatINR(t.outstanding)} lent out, ${formatINR(t.pool)} available`}
                  segments={[{ value: t.outstanding, color: "var(--accent)", label: "Lent out" }, { value: Math.max(t.pool, 0), color: "var(--green)", label: "Available" }]}
                  center={<div><div className="text-[11px] text-muted">Members</div><div className="num text-xl font-semibold">{memberIds.length}</div></div>} />
                <div className="w-full flex-1">
                  <KeyValue rows={[
                    { k: <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-[var(--green)]" aria-hidden="true" />Available to lend</span>, v: formatINR(t.pool) },
                    { k: <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-accent" aria-hidden="true" />Lent out ({stats.activeLoans} loan{stats.activeLoans === 1 ? "" : "s"})</span>, v: formatINR(t.outstanding) },
                    { k: "On-time repayment", v: stats.onTimeRate === null ? "n/a" : `${Math.round(stats.onTimeRate)}%` },
                    { k: "Overdue", v: <span className={stats.overdueCount ? "text-neg" : ""}>{formatINR(stats.overdueAmount)}{stats.overdueCount ? ` (${stats.overdueCount})` : ""}</span> },
                  ]} />
                </div>
              </div>
            </Card>
            {nudges.map((n) => <Notice key={n.id} tone={n.severity === "warn" ? "warn" : "info"} title={n.title}>{n.body}</Notice>)}
            {open.length > 0 && (<div><SectionTitle>In progress</SectionTitle><Card className="divide-y divide-line p-0 md:p-0">
              {open.map((l) => <LoanListItem bare key={l.id} href={`/loans/${l.id}`} borrowerName={userRows.get(l.borrowerId)?.name ?? "Member"} circleName={circle.name} amount={l.amount} purpose={l.purpose} status={displayStatus(l, false)} />)}
            </Card></div>)}
            <div>
              <SectionTitle>Members</SectionTitle>
              <Card className="flex items-center justify-between gap-3">
                <div className="flex -space-x-2">{memberIds.slice(0, 7).map((m) => <span key={m} className="rounded-full ring-2 ring-surface"><Avatar name={userRows.get(m)?.name ?? "Member"} size={36} /></span>)}{memberIds.length > 7 && <span className="flex size-9 items-center justify-center rounded-full bg-surface2 text-xs font-semibold ring-2 ring-surface">+{memberIds.length - 7}</span>}</div>
                <Link href={`/circles/${id}?tab=members`} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand md:min-h-8">View all</Link>
              </Card>
            </div>
            <Notice tone="warn" title="Risk">{RISK_DISCLOSURE}</Notice>
          </div>
        );
      })()}

      {tab === "members" && (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface px-4">
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
        return <Card className="divide-y divide-line p-0 md:p-0">{list.map((l) => {
          const overdue = l.status === "repaying" && db.select().from(instalments).where(and(eq(instalments.loanId, l.id), eq(instalments.state, "active"))).all().some((i) => !i.paidAt && instalmentStatus(i.dueDate, now, false) === "overdue");
          return <LoanListItem bare key={l.id} href={`/loans/${l.id}`} borrowerName={userRows.get(l.borrowerId)?.name ?? "Member"} circleName={circle.name} amount={l.amount} purpose={l.purpose} status={displayStatus(l, overdue)} />;
        })}</Card>;
      })()}

      {tab === "ledger" && (
        <Card>
          <div className="mb-1 flex items-center justify-between"><h2 className="text-base font-semibold">Recent activity</h2><Link href={`/ledger?circle=${id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand">Full ledger and CSV</Link></div>
          <p className="mb-2 text-xs text-muted">Append-only: entries are never edited or deleted. Mistakes are corrected with a reversal entry.</p>
          <ul className="divide-y divide-line">{recentLedger(db, id, 25).map((r) => <LedgerRow key={r.id} r={{ ...r, actorName: userRows.get(r.actorId)?.name }} />)}</ul>
        </Card>
      )}

      {tab === "rules" && (
        <div className="space-y-5">
          <Card>
            <h2 className="mb-1 text-base font-semibold">Circle rules</h2>
            <KeyValue rows={[
              { k: "Max loan per member", v: formatINR(circle.maxLoan) },
              { k: "Interest", v: `${circle.interestPct}% a year, simple` },
              { k: "Approval needed", v: `${circle.approvalThresholdPct}% of members` },
              { k: "Late penalty", v: circle.latePenaltyType === "flat" ? formatINR(circle.latePenaltyValue) : `${circle.latePenaltyValue}% of instalment` },
              { k: "Voting window", v: `${circle.votingWindowHours} hours` },
              { k: "Platform fee", v: "1.5% of principal, paid by borrower" },
            ]} />
            <p className="mt-3 text-xs text-muted">Each loan keeps the rules in force when it was requested.</p>
          </Card>
          {isAdmin ? (
            <>
              <Card><h2 className="mb-3 text-base font-semibold">Edit rules (admin)</h2><RulesEditor circleId={id} circle={circle} /></Card>
              <Card><h2 className="mb-1 text-base font-semibold">Compliance mode</h2><p className="mb-3 text-sm text-muted">Decides who can borrow and how funds are routed.</p><ComplianceToggle circleId={id} mode={circle.complianceMode as "A" | "C"} /></Card>
            </>
          ) : <Notice><Lock size={14} className="mr-1 inline" aria-hidden="true" />Only the circle admin can change rules.</Notice>}
        </div>
      )}

      {tab === "performance" && (() => {
        const sub = db.select().from(premiumSubscriptions).where(and(eq(premiumSubscriptions.circleId, id), eq(premiumSubscriptions.active, true))).get();
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Annualised yield" value={`${stats.yieldPct.toFixed(1)}%`} sub="Interest and penalties on money out" />
              <StatTile label="Interest earned" value={formatINR(t.interestEarned, { showPaise: true })} />
              <StatTile label="Penalties" value={formatINR(t.penalties, { showPaise: true })} />
              <StatTile label="Written off" value={formatINR(t.writtenOff)} tone={t.writtenOff ? "neg" : undefined} />
            </div>
            {circle.premium ? (
              <Card>
                <h2 className="mb-1 flex items-center gap-2 text-base font-semibold"><Sparkles size={18} className="text-accent" aria-hidden="true" /> Premium analytics</h2>
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
            {isAdmin && <Card><h2 className="mb-3 text-base font-semibold">Circle Premium</h2><PremiumPanel circleId={id} active={circle.premium} price={sub?.pricePerMonth ?? null} /></Card>}
          </div>
        );
      })()}

      {tab === "invite" && (
        <Card>
          <h2 className="mb-3 text-base font-semibold">Invite people</h2>
          {isAdmin
            ? <InvitePanel circleId={id} code={circleInviteCode(db, id)} origin={await originOf()} />
            : <Notice>Only the admin can create invite links. Ask {userRows.get(circle.creatorId)?.name ?? "the admin"} to share the code.</Notice>}
        </Card>
      )}
        </div>
        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">{actionPanel}</aside>
      </div>

      <div className="no-print fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 grid grid-cols-2 gap-3 border-t border-line bg-surface px-4 py-2.5 md:hidden">
        <LinkButton href={`/contribute?circle=${id}`} variant="ghost" full>Contribute</LinkButton>
        <LinkButton href={`/loans/new?circle=${id}`} variant="primary" full>Request loan</LinkButton>
      </div>
      <div className="h-16 md:hidden" aria-hidden="true" />
    </div>
  );
}

async function originOf() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
