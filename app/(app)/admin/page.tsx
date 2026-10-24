import { requireCtx } from "@/lib/session";
import { PILOT_TARGET_CIRCLES, pilotMetrics } from "@/lib/core/admin";
import { formatINR, formatINRCompact } from "@/lib/domain/money";
import { Card, PageHeader, ProgressBar, StatTile } from "@/components/ui";

export const metadata = { title: "Pilot metrics" };

const pct = (v: number | null) => (v === null ? "n/a" : `${v.toFixed(0)}%`);

export default async function PilotMetrics() {
  const { db, now } = await requireCtx();
  const m = pilotMetrics(db, now);
  return (
    <div>
      <PageHeader title="Pilot metrics" subtitle="Live from the seeded data. Targets come from the business plan." />
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Active circles" value={m.activeCircles} sub={`of ${m.totalCircles} created · target ${PILOT_TARGET_CIRCLES.min}-${PILOT_TARGET_CIRCLES.max}`} />
        <StatTile label="On-time repayment" value={pct(m.onTimeRate)} sub="Instalments paid by the due day" tone={m.onTimeRate !== null && m.onTimeRate < 80 ? "warn" : "pos"} />
        <StatTile label="Member retention" value={pct(m.retention)} sub="Members still active" />
        <StatTile label="NPS" value={m.nps === null ? "n/a" : m.nps} sub={`${m.npsResponses} response${m.npsResponses === 1 ? "" : "s"}`} />
        <StatTile label="Average circle pool" value={formatINR(m.avgPool)} />
        <StatTile label="Loans facilitated (AUM)" value={formatINRCompact(m.aum)} />
        <StatTile label="Take rate" value={m.takeRate === null ? "n/a" : `${m.takeRate.toFixed(2)}%`} sub="Platform fees / loans facilitated" />
      </div>
      <Card className="mt-5">
        <h2 className="mb-2 text-base font-semibold">Progress to the pilot target</h2>
        <ProgressBar value={m.activeCircles / PILOT_TARGET_CIRCLES.min} label="Active circles toward the lower pilot target" />
        <p className="mt-2 text-xs text-muted">{m.activeCircles} of {PILOT_TARGET_CIRCLES.min} circles (lower end of the 50 to 100 target). A circle counts as active with 3 or more members.</p>
      </Card>
    </div>
  );
}
