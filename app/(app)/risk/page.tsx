import { eq } from "drizzle-orm";
import { requireCtx } from "@/lib/session";
import { schema } from "@/lib/db";
import { riskForUser } from "@/lib/core/stats";
import { myCircles } from "@/lib/core/position";
import { activeMemberIds } from "@/lib/core/shared";
import { RISK_WEIGHTS } from "@/lib/domain/risk";
import { Card, Notice, PageHeader, ProgressBar, RiskBadge } from "@/components/ui";

export const metadata = { title: "Risk score" };

export default async function RiskPage({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  const { db, user, now } = await requireCtx();
  const sp = await searchParams;
  let subject = user;
  if (sp.user && sp.user !== user.id) {
    const shared = myCircles(db, user.id).some((c) => activeMemberIds(db, c.id).includes(sp.user!));
    const other = shared ? db.select().from(schema.users).where(eq(schema.users.id, sp.user)).get() : null;
    if (other) subject = other;
  }
  const r = riskForUser(db, subject.id, now);
  const self = subject.id === user.id;
  return (
    <div>
      <PageHeader back={self ? "/profile" : undefined} title={self ? "Your risk score" : `${subject.name}'s risk score`} subtitle="A transparent score from five visible factors. No hidden data, no credit bureau." />
      <Card className="mb-5 text-center">
        {r.score === null ? (
          <><RiskBadge band={null} score={null} /><p className="mt-3 text-sm text-muted">There is not enough history yet (no repayments and under 30 days on the platform). Members will see “Not enough history”, not a low score.</p></>
        ) : (
          <><div className="num font-display text-6xl font-bold">{r.score}<span className="text-2xl text-muted">/100</span></div><div className="mt-2"><RiskBadge band={r.band} score={r.score} /></div></>
        )}
        {r.cap && <Notice tone="warn" title={`Score capped at ${r.cap.limit}`} className="mt-4 text-left">{r.cap.reason}</Notice>}
      </Card>
      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">What counts</h2>
        <ul className="space-y-4">{r.factors.map((f) => (
          <li key={f.key}>
            <div className="flex items-baseline justify-between text-sm"><span className="font-semibold">{f.label}</span><span className="num">{f.points} / {f.max}</span></div>
            <ProgressBar value={f.max ? f.points / f.max : 0} label={`${f.label}: ${f.points} of ${f.max}`} tone={f.points / f.max >= 0.7 ? "pos" : f.points / f.max >= 0.4 ? "warn" : "neg"} />
            <p className="mt-1 text-xs text-muted">{f.detail}</p>
          </li>
        ))}</ul>
        <p className="mt-4 text-xs text-muted">Weights: repayment {RISK_WEIGHTS.repayment}, time on platform {RISK_WEIGHTS.tenure}, past approvals {RISK_WEIGHTS.approval}, current exposure {RISK_WEIGHTS.exposure}, verification {RISK_WEIGHTS.verification}. 75+ is low risk, 50 to 74 medium, below 50 high. A default on record caps the score at 49. It is a guide for voting, not a guarantee.</p>
      </Card>
    </div>
  );
}
