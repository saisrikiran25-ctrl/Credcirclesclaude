import Link from "next/link";
import { requireCtx } from "@/lib/session";
import { myCircles, myLoans, myPosition } from "@/lib/core/position";
import { memberCapacity, memberContributionTotals } from "@/lib/core/stats";
import { displayStatus } from "@/lib/core/loans";
import { formatINR } from "@/lib/domain/money";
import { Badge, Card, Notice, PageHeader, SectionTitle, StatTile } from "@/components/ui";
import { RingGauge } from "@/components/client/ring";
import { LoanListItem } from "@/components/loan-bits";
import { fmtDay } from "@/lib/utils";

export const metadata = { title: "My position" };

export default async function PositionPage() {
  const { db, user, now } = await requireCtx();
  const p = myPosition(db, user.id, now);
  const circles = myCircles(db, user.id);
  const loans = myLoans(db, user.id).filter((l) => l.mine || l.lending).filter((l) => ["repaying", "approved", "voting", "defaulted"].includes(l.loan.status));
  return (
    <div>
      <PageHeader back="/home" title="My position" subtitle="Everything you have lent and borrowed, in one place." />
      <Card className="mb-5">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <RingGauge size={170} thickness={20} ariaLabel={`Lent out ${formatINR(p.lentOutstanding)}, borrowed ${formatINR(p.borrowedOutstanding)}`}
            segments={[{ value: p.lentOutstanding, color: "var(--brand)", label: "Lent" }, { value: p.borrowedOutstanding, color: "var(--accent)", label: "Borrowed" }]}
            center={<div><div className="text-xs text-muted">Net</div><div className="num font-display text-xl font-bold">{formatINR(p.net)}</div></div>} />
          <div className="grid w-full flex-1 grid-cols-2 gap-3">
            <StatTile label="Lent out now" value={formatINR(p.lentOutstanding)} sub={`${formatINR(p.totalLent)} lent in total`} />
            <StatTile label="Borrowed now" value={formatINR(p.borrowedOutstanding)} sub={`${formatINR(p.totalBorrowed)} borrowed in total`} />
            <StatTile label="Earnings" value={formatINR(p.earnings, { showPaise: true })} tone="pos" sub="Your share of interest and penalties" />
            <StatTile label="Loss share" value={formatINR(p.lossShare)} tone={p.lossShare ? "neg" : undefined} sub="From defaults" />
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-xs text-muted"><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full bg-brand" aria-hidden="true" /> Lent</span><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full bg-accent" aria-hidden="true" /> Borrowed</span></div>
      </Card>

      <SectionTitle>Coming up</SectionTitle>
      {p.dues.length === 0 ? <Notice>No repayments coming up.</Notice> : (
        <ul className="space-y-2">{p.dues.map((d) => (
          <li key={`${d.loanId}-${d.number}`}><Link href={`/loans/${d.loanId}#repay`} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3.5 hover:border-brand"><span><span className="font-semibold">Instalment {d.number}</span><span className="block text-xs text-muted">{d.circleName} · due {fmtDay(d.dueDate)}</span></span><span className="flex items-center gap-2"><span className="num font-semibold">{formatINR(d.amount, { showPaise: true })}</span><Badge tone={d.status === "overdue" ? "neg" : d.status === "due" ? "warn" : "neutral"}>{d.status === "overdue" ? "Overdue" : d.status === "due" ? "Due soon" : "Upcoming"}</Badge></span></Link></li>
        ))}</ul>
      )}

      <SectionTitle>By circle</SectionTitle>
      <div className="space-y-3">{circles.map((c) => {
        const contributed = memberContributionTotals(db, c.id).get(user.id) ?? 0;
        const cap = memberCapacity(db, c.id).get(user.id) ?? 0;
        return <Link key={c.id} href={`/circles/${c.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-brand"><span className="font-semibold">{c.name}</span><span className="num text-right text-sm"><span className="block">Contributed {formatINR(contributed)}</span><span className="text-muted">Can lend {formatINR(Math.max(cap, 0))}</span></span></Link>;
      })}</div>

      {loans.length > 0 && <><SectionTitle>Active loans</SectionTitle><div className="space-y-3">{loans.map((r) => <LoanListItem key={r.loan.id} href={`/loans/${r.loan.id}`} borrowerName={r.mine ? "You" : r.borrowerName} circleName={r.circleName} amount={r.loan.amount} purpose={r.loan.purpose} status={displayStatus(r.loan, false)} extra={r.mine ? "You borrowed" : "You lent"} />)}</div></>}
    </div>
  );
}
