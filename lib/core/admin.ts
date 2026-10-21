import { eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { circleStats, onTimeCutoff } from "./stats";
import type { DbLike } from "./shared";

const { circles, loans, platformFees, premiumSubscriptions, npsResponses, memberships, instalments, ledgerEntries } = schema;

/** Pilot metrics: active circles, on-time rate, retention, NPS, average pool, AUM, take rate. */
export function pilotMetrics(db: DbLike, now: Date) {
  const allCircles = db.select().from(circles).all();
  const active = allCircles.filter((c) => {
    const n = db.select().from(memberships).where(eq(memberships.circleId, c.id)).all().filter((m) => m.status === "active").length;
    return n >= 3;
  });
  let pools = 0;
  for (const c of active) {
    const t = circleStats(db, c.id, now).totals;
    pools += t.pool + t.outstanding;
  }
  const insts = db.select().from(instalments).all().filter((i) => i.state === "active");
  const settled = insts.filter((i) => i.paidAt || now.getTime() >= onTimeCutoff(i.dueDate));
  const onTime = settled.filter((i) => i.paidAt && i.paidAt.getTime() <= onTimeCutoff(i.dueDate)).length;
  const mships = db.select().from(memberships).all();
  const retained = mships.filter((m) => m.status === "active").length;
  const nps = db.select().from(npsResponses).all();
  const promoters = nps.filter((n) => n.score >= 9).length;
  const detractors = nps.filter((n) => n.score <= 6).length;
  const facilitated = db.select().from(loans).all().filter((l) => ["repaying", "closed", "defaulted"].includes(l.status)).reduce((a, l) => a + l.amount, 0);
  const fees = db.select().from(platformFees).all().reduce((a, f) => a + f.amount, 0);
  return {
    activeCircles: active.length,
    totalCircles: allCircles.length,
    onTimeRate: settled.length === 0 ? null : (onTime / settled.length) * 100,
    retention: mships.length === 0 ? null : (retained / mships.length) * 100,
    nps: nps.length === 0 ? null : Math.round(((promoters - detractors) / nps.length) * 100),
    npsResponses: nps.length,
    avgPool: active.length === 0 ? 0 : Math.round(pools / active.length),
    aum: facilitated,
    takeRate: facilitated === 0 ? null : (fees / facilitated) * 100,
  };
}

/** Internal revenue view: platform fees collected and Circle Premium subscriptions. */
export function revenueView(db: DbLike) {
  const fees = db.select().from(platformFees).all();
  const subs = db.select().from(premiumSubscriptions).all().filter((s) => s.active);
  const names = new Map(db.select().from(circles).all().map((c) => [c.id, c.name]));
  const feeTotal = fees.reduce((a, f) => a + f.amount, 0);
  const mrr = subs.reduce((a, s) => a + s.pricePerMonth, 0);
  return {
    feeTotal, feeCount: fees.length, mrr,
    subs: subs.map((s) => ({ circle: names.get(s.circleId) ?? "Circle", price: s.pricePerMonth, since: s.startedAt })),
    recentFees: fees.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 8).map((f) => ({ ...f, circle: names.get(f.circleId) ?? "Circle" })),
    ledgerCount: db.select().from(ledgerEntries).all().length,
  };
}

/**
 * Illustrative 3-year projection, copied as written in the business description. Static, not a forecast.
 * NOTE: Year 1 revenue does not follow from the table's own inputs (1.5% of ₹50 lakh is ₹75,000, not
 * ₹7.5 lakh). Years 2 and 3 do reconcile (2% of ₹10 cr = ₹20 lakh; 2% of ₹100 cr = ₹2 cr). The UI
 * shows the figures as given and flags this; see DECISIONS.md.
 */
export const PROJECTIONS = [
  { year: "Year 1", circles: "100", avgPool: "₹50k", aum: "₹50 lakh", takeRate: "1.5%", revenue: "₹7.5 lakh" },
  { year: "Year 2", circles: "1,000", avgPool: "₹1 lakh", aum: "₹10 cr", takeRate: "2%", revenue: "₹20 lakh" },
  { year: "Year 3", circles: "5,000", avgPool: "₹2 lakh", aum: "₹100 cr", takeRate: "2%", revenue: "₹2 cr" },
] as const;

export const PILOT_TARGET_CIRCLES = { min: 50, max: 100 };
