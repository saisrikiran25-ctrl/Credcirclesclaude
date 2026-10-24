import Link from "next/link";
import { CalendarClock, ChevronRight, HandCoins, KeyRound, PiggyBank, Plus, ShieldCheck, Users, Vote, Wallet, BookOpen, Gauge } from "lucide-react";
import { requireCtx } from "@/lib/session";
import { myCircles, myPosition, pendingPayments, pendingVotes } from "@/lib/core/position";
import { circleNudges, circleStats, portfolioSeries } from "@/lib/core/stats";
import { formatINR } from "@/lib/domain/money";
import { Badge, Card, Delta, EmptyState, LinkButton, Notice, SectionTitle, SeeAll, Sparkline } from "@/components/ui";
import { CountUp } from "@/components/client/ring";
import { purposeLabel } from "@/components/loan-bits";
import { fmtDay, timeLeft } from "@/lib/utils";

export const metadata = { title: "Home" };

const greeting = (now: Date) => {
  const h = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(now));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const SHORTCUTS = [
  { href: "/contribute", icon: PiggyBank, label: "Contribute" },
  { href: "/loans/new", icon: HandCoins, label: "Request loan" },
  { href: "/circles/new", icon: Plus, label: "New circle" },
  { href: "/join", icon: KeyRound, label: "Join" },
];

const EXPLORE = [
  { href: "/learn/how-circles-work", icon: BookOpen, title: "How circles work", sub: "5 min read" },
  { href: "/learn/risk-sharing", icon: ShieldCheck, title: "How losses are shared", sub: "Know the risk" },
  { href: "/risk", icon: Gauge, title: "Your risk score", sub: "See what counts" },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { db, user, now } = await requireCtx();
  const sp = await searchParams;
  const pos = myPosition(db, user.id, now);
  const circles = myCircles(db, user.id);
  const votes = pendingVotes(db, user.id, now);
  const payments = pendingPayments(db, user.id);
  const nudges = circles.flatMap((c) => circleNudges(db, c.id, now).map((n) => ({ ...n, circle: c.name, circleId: c.id }))).slice(0, 3);
  const dues = pos.dues.filter((d) => d.status !== "upcoming" || d.dueDate.getTime() - now.getTime() < 10 * 86400000);
  const actions = payments.length + votes.length + dues.length;

  const todo = (
    <>
      {payments.map((p) => (
        <Link key={p.share.id} href={`/loans/${p.loan.id}#pay`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brandsoft text-brand"><Wallet size={18} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1"><div className="font-medium">Pay {formatINR(p.share.amount)} to {p.borrowerName}</div><div className="truncate text-xs text-muted">Your UPI share · {p.circleName}</div></div>
          <Badge tone="brand">Pay now</Badge>
        </Link>
      ))}
      {votes.map((v) => (
        <Link key={v.loan.id} href={`/loans/${v.loan.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accentsoft text-accent"><Vote size={18} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1"><div className="font-medium">Vote: {v.borrowerName} wants {formatINR(v.loan.amount)}</div><div className="truncate text-xs text-muted">{purposeLabel(v.loan.purpose)} · {v.circleName} · {timeLeft(v.loan.votingEndsAt, now.getTime())}</div></div>
          <Badge tone="accent">Vote</Badge>
        </Link>
      ))}
      {dues.map((d) => (
        <Link key={`${d.loanId}-${d.number}`} href={`/loans/${d.loanId}#repay`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warnsoft text-warn"><CalendarClock size={18} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1"><div className="font-medium">Instalment {d.number}: <span className="num">{formatINR(d.amount, { showPaise: true })}</span></div><div className="truncate text-xs text-muted">{d.circleName} · due {fmtDay(d.dueDate)}</div></div>
          <Badge tone={d.status === "overdue" ? "neg" : "warn"}>{d.status === "overdue" ? "Overdue" : "Due soon"}</Badge>
        </Link>
      ))}
    </>
  );

  const watchlist = circles.length === 0 ? (
    <EmptyState icon={<Users size={24} />} title="You are not in a circle yet" body="Create one for your hostel, club or friends, or join with an invite code." action={<div className="flex gap-2"><LinkButton href="/circles/new">Create a circle</LinkButton><LinkButton href="/join" variant="ghost">Join with code</LinkButton></div>} />
  ) : (
    <Card className="divide-y divide-line p-0 md:p-0">
      {circles.map((c) => {
        const s = circleStats(db, c.id, now);
        const series = portfolioSeries(db, c.id, now, 14).map((p) => p.pool);
        const capital = s.totals.pool + s.totals.outstanding;
        return (
          <Link key={c.id} href={`/circles/${c.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-surface2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brandsoft text-sm font-bold text-brand" aria-hidden="true">{c.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{c.name}</div>
              <div className="truncate text-xs text-muted">{c.memberCount} members · {c.role === "admin" ? "You admin" : c.city}</div>
            </div>
            <Sparkline width={52} values={series} up={s.overdueCount === 0} />
            <div className="w-24 text-right">
              <div className="num font-semibold">{formatINR(capital)}</div>
              {s.overdueCount > 0 ? <span className="text-xs font-semibold text-neg">{s.overdueCount} overdue</span> : <span className="text-xs text-muted">{s.onTimeRate === null ? "No repayments" : `${Math.round(s.onTimeRate)}% on time`}</span>}
            </div>
          </Link>
        );
      })}
    </Card>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <h1 className="mb-3 text-xl font-semibold tracking-tight md:text-2xl">{greeting(now)}, {user.name.split(" ")[0]}</h1>
        {sp.welcome && <Notice tone="pos" title="You are verified and in." className="mb-4">Create a circle or ask a friend for an invite code to join one.</Notice>}

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-medium text-muted">My position</h2>
              <div className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
                {pos.net < 0 && "-"}<CountUp value={Math.abs(pos.net)} />
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <span className="text-muted">Earnings</span><Delta paise={pos.earnings} />
              </div>
            </div>
            <Link href="/position" className="inline-flex min-h-11 items-center gap-0.5 text-sm font-semibold text-brand md:min-h-8">Details <ChevronRight size={16} aria-hidden="true" /></Link>
          </div>
          <dl className="mt-4 grid grid-cols-2 divide-x divide-line rounded-xl bg-surface2 text-sm">
            <div className="p-3"><dt className="text-xs text-muted">Lent out</dt><dd className="num mt-0.5 text-base font-semibold">{formatINR(pos.lentOutstanding)}</dd></div>
            <div className="p-3 pl-4"><dt className="text-xs text-muted">Borrowed</dt><dd className="num mt-0.5 text-base font-semibold">{formatINR(pos.borrowedOutstanding)}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-muted">Net = lent out minus borrowed. Your money stays in your bank account.</p>
        </Card>

        <ul className="mt-4 grid grid-cols-4 gap-2">
          {SHORTCUTS.map(({ href, icon: Icon, label }) => (
            <li key={href}>
              <Link href={href} className="flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-xl border border-line bg-surface px-1 py-3 text-center text-xs font-medium transition hover:bg-surface2 active:scale-[0.98] md:flex-row md:justify-start md:gap-2.5 md:px-3 md:text-sm">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brandsoft text-brand"><Icon size={20} aria-hidden="true" /></span>
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {actions > 0 && (
          <>
            <SectionTitle action={<Badge tone="neg" className="num">{actions} pending</Badge>}>Needs you</SectionTitle>
            <Card className="divide-y divide-line p-0 md:p-0">{todo}</Card>
          </>
        )}

        <div className="lg:hidden">
          <SectionTitle action={<SeeAll href="/circles">All circles</SeeAll>}>My circles</SectionTitle>
          {watchlist}
        </div>

        {nudges.length > 0 && (
          <>
            <SectionTitle>Worth a look</SectionTitle>
            <div className="space-y-3">{nudges.map((n) => <Notice key={n.circleId + n.id} tone={n.severity === "warn" ? "warn" : "info"} title={`${n.title} · ${n.circle}`}>{n.body}</Notice>)}</div>
          </>
        )}
      </div>

      <aside className="min-w-0 space-y-0 lg:sticky lg:top-20 lg:self-start">
        <div className="hidden lg:block">
          <SectionTitle action={<SeeAll href="/circles">All</SeeAll>}>Watchlist: my circles</SectionTitle>
          {watchlist}
        </div>
        <SectionTitle>Explore</SectionTitle>
        <ul className="hide-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 lg:mx-0 lg:grid lg:overflow-visible lg:px-0">
          {EXPLORE.map(({ href, icon: Icon, title, sub }) => (
            <li key={href} className="w-56 shrink-0 lg:w-auto">
              <Link href={href} className="flex min-h-16 items-center gap-3 rounded-xl border border-line bg-surface p-3.5 transition hover:bg-surface2">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accentsoft text-accent"><Icon size={20} aria-hidden="true" /></span>
                <span className="min-w-0"><span className="block font-medium">{title}</span><span className="block text-xs text-muted">{sub}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
