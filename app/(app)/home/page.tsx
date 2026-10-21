import Link from "next/link";
import { CalendarClock, HandCoins, PiggyBank, Plus, Users, Vote, Wallet } from "lucide-react";
import { requireCtx } from "@/lib/session";
import { loanDetail, displayStatus } from "@/lib/core/loans";
import { myCircles, myPosition, pendingPayments, pendingVotes } from "@/lib/core/position";
import { circleNudges, circleStats } from "@/lib/core/stats";
import { formatINR } from "@/lib/domain/money";
import { Badge, Card, EmptyState, LinkButton, Notice, PageHeader, SectionTitle } from "@/components/ui";
import { CountUp, RingGauge } from "@/components/client/ring";
import { StatusBadge, purposeLabel } from "@/components/loan-bits";
import { fmtDay, timeLeft } from "@/lib/utils";

export const metadata = { title: "Home" };

const greeting = (now: Date) => {
  const h = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(now));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default async function Home({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { db, user, now } = await requireCtx();
  const sp = await searchParams;
  const pos = myPosition(db, user.id, now);
  const circles = myCircles(db, user.id);
  const votes = pendingVotes(db, user.id, now);
  const payments = pendingPayments(db, user.id);
  const nudges = circles.flatMap((c) => circleNudges(db, c.id, now).map((n) => ({ ...n, circle: c.name, circleId: c.id }))).slice(0, 3);
  const dues = pos.dues.filter((d) => d.status !== "upcoming" || d.dueDate.getTime() - now.getTime() < 10 * 86400000);

  return (
    <div>
      <PageHeader title={`${greeting(now)}, ${user.name.split(" ")[0]}`} subtitle="Here is where you stand across your circles." />
      {sp.welcome && <Notice tone="pos" title="You are verified and in." className="mb-5">Create a circle or ask a friend for an invite code to join one.</Notice>}

      <Card className="relative overflow-hidden !border-0 !bg-brand text-onbrand">
        <div className="blob -right-16 -top-16 size-52 bg-accent/60" aria-hidden="true" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold opacity-80">My position</h2>
            <Link href="/position" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">Details</Link>
          </div>
          <div className="mt-1 text-xs opacity-75">Net = lent out minus borrowed</div>
          <div className="mt-1 font-display text-4xl font-bold">
            {pos.net < 0 && "-"}<CountUp value={Math.abs(pos.net)} />
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
            <div><dt className="opacity-75">Lent out</dt><dd className="num font-semibold">{formatINR(pos.lentOutstanding)}</dd></div>
            <div><dt className="opacity-75">Borrowed</dt><dd className="num font-semibold">{formatINR(pos.borrowedOutstanding)}</dd></div>
            <div><dt className="opacity-75">Earnings</dt><dd className="num font-semibold">{formatINR(pos.earnings, { showPaise: true })}</dd></div>
          </dl>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { href: "/contribute", icon: PiggyBank, label: "Contribute" },
          { href: "/loans/new", icon: HandCoins, label: "Request loan" },
          { href: "/circles/new", icon: Plus, label: "Create circle" },
        ].map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-3xl border border-line bg-surface text-sm font-semibold transition hover:border-brand active:scale-[0.98]">
            <span className="flex size-11 items-center justify-center rounded-full bg-accent text-onaccent"><Icon size={20} aria-hidden="true" /></span>
            {label}
          </Link>
        ))}
      </div>

      {(payments.length > 0 || votes.length > 0 || dues.length > 0) && (
        <>
          <SectionTitle>Needs you</SectionTitle>
          <div className="space-y-3">
            {payments.map((p) => (
              <Link key={p.share.id} href={`/loans/${p.loan.id}#pay`} className="flex items-center gap-3 rounded-2xl border-2 border-accent bg-surface p-4">
                <span className="flex size-11 items-center justify-center rounded-full bg-accent text-onaccent"><Wallet size={20} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">Pay {formatINR(p.share.amount)} to {p.borrowerName}</div>
                  <div className="text-sm text-muted">Your UPI share of an approved loan in {p.circleName}</div>
                </div>
                <Badge tone="accent">Pay now</Badge>
              </Link>
            ))}
            {votes.map((v) => (
              <Link key={v.loan.id} href={`/loans/${v.loan.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-brand">
                <span className="flex size-11 items-center justify-center rounded-full bg-brandsoft text-brand"><Vote size={20} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">Vote: {v.borrowerName} wants {formatINR(v.loan.amount)}</div>
                  <div className="text-sm text-muted">{purposeLabel(v.loan.purpose)} · {v.circleName} · {timeLeft(v.loan.votingEndsAt, now.getTime())}</div>
                </div>
                <Badge tone="brand">Vote</Badge>
              </Link>
            ))}
            {dues.map((d) => (
              <Link key={`${d.loanId}-${d.number}`} href={`/loans/${d.loanId}#repay`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-brand">
                <span className="flex size-11 items-center justify-center rounded-full bg-warnsoft text-warn"><CalendarClock size={20} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">Instalment {d.number}: <span className="num">{formatINR(d.amount, { showPaise: true })}</span></div>
                  <div className="text-sm text-muted">{d.circleName} · due {fmtDay(d.dueDate)}</div>
                </div>
                <Badge tone={d.status === "overdue" ? "neg" : "warn"}>{d.status === "overdue" ? "Overdue" : "Due soon"}</Badge>
              </Link>
            ))}
          </div>
        </>
      )}

      <SectionTitle action={<Link href="/circles" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand">All circles</Link>}>My circles</SectionTitle>
      {circles.length === 0 ? (
        <EmptyState icon={<Users size={26} />} title="You are not in a circle yet" body="Create one for your hostel, club or friends, or join with an invite code." action={<div className="flex gap-2"><LinkButton href="/circles/new">Create a circle</LinkButton><LinkButton href="/join" variant="ghost">Join with code</LinkButton></div>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {circles.map((c) => {
            const s = circleStats(db, c.id, now);
            const capital = s.totals.pool + s.totals.outstanding;
            return (
              <Link key={c.id} href={`/circles/${c.id}`} className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-4 transition hover:border-brand">
                <RingGauge size={84} thickness={11} ariaLabel={`${c.name}: ${formatINR(s.totals.outstanding)} lent out, ${formatINR(s.totals.pool)} available`}
                  segments={[{ value: s.totals.outstanding, color: "var(--accent)", label: "Lent" }, { value: s.totals.pool, color: "var(--brand)", label: "Available" }]}
                  center={<Users size={18} className="text-muted" aria-hidden="true" />} />
                <div className="min-w-0">
                  <div className="truncate font-display font-semibold">{c.name}</div>
                  <div className="text-xs text-muted">{c.memberCount} members · {c.city}{c.role === "admin" ? " · you admin" : ""}</div>
                  <div className="num mt-1 text-sm"><span className="font-semibold">{formatINR(capital)}</span> <span className="text-muted">pool</span></div>
                  {s.overdueCount > 0 && <Badge tone="neg" className="mt-1">{s.overdueCount} overdue</Badge>}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {nudges.length > 0 && (
        <>
          <SectionTitle>Worth a look</SectionTitle>
          <div className="space-y-3">
            {nudges.map((n) => (
              <Notice key={n.circleId + n.id} tone={n.severity === "warn" ? "warn" : "info"} title={`${n.title} · ${n.circle}`}>{n.body}</Notice>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
