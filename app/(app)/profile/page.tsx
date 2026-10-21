import Link from "next/link";
import { eq } from "drizzle-orm";
import { BadgeCheck, BarChart3, Building2, ChevronRight, Languages, Map, Rocket, Sprout, TrendingUp } from "lucide-react";
import { requireCtx } from "@/lib/session";
import { schema } from "@/lib/db";
import { LOCALES } from "@/lib/i18n";
import { SEGMENTS } from "@/lib/config";
import { riskForUser } from "@/lib/core/stats";
import { Avatar, Badge, Card, Notice, PageHeader, RiskBadge, SectionTitle } from "@/components/ui";
import { ThemeToggle } from "@/components/client/theme-toggle";
import { PersonaButtons } from "@/components/client/persona-buttons";
import { NpsWidget } from "@/components/client/nps";
import { LogoutButton } from "@/components/client/logout-button";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Profile" };

const SOON = [
  { icon: Sprout, title: "Auto-invest into circles", body: "Set a monthly amount that flows to your favourite circle.", toggle: true },
  { icon: TrendingUp, title: "Micro-investments", body: "Cross-sell, coming later: small SIPs for circle members.", toggle: false },
  { icon: Rocket, title: "Insurance and skilling", body: "Cross-sell, coming later: cover and courses from partners.", toggle: false },
];

export default async function Profile() {
  const { db, user, now } = await requireCtx();
  const kyc = db.select().from(schema.kycRecords).where(eq(schema.kycRecords.userId, user.id)).get();
  const risk = riskForUser(db, user.id, now);
  const seg = SEGMENTS.find((s) => s.id === user.segment)?.label ?? user.segment;
  return (
    <div>
      <PageHeader title="Profile" />
      <Card className="mb-5">
        <div className="flex items-center gap-4"><Avatar name={user.name} size={64} /><div className="min-w-0"><div className="font-display text-xl font-semibold">{user.name}</div><div className="text-sm text-muted">{seg} · {user.city}{user.institution ? ` · ${user.institution}` : ""}</div><div className="num text-xs text-muted">+91 {user.phone} · joined {fmtDate(user.createdAt)}</div></div></div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-2xl bg-surface2 p-3"><dt className="text-muted">UPI ID</dt><dd className="num font-semibold">{user.vpa}</dd></div>
          <div className="rounded-2xl bg-surface2 p-3"><dt className="text-muted">Identity verification</dt><dd className="flex items-center gap-2 font-semibold">{user.kycStatus === "verified" ? <><BadgeCheck size={18} className="text-pos" aria-hidden="true" /> Verified <span className="num font-normal text-muted">{kyc ? `${kyc.idType.toUpperCase()} ${kyc.maskedId}` : ""}</span></> : "Not verified"}</dd></div>
        </dl>
        <Link href="/risk" className="mt-4 flex min-h-12 items-center justify-between rounded-2xl border border-line px-4 hover:border-brand"><span className="font-semibold">Your risk score</span><span className="flex items-center gap-2"><RiskBadge band={risk.band} score={risk.score} /><ChevronRight size={18} aria-hidden="true" /></span></Link>
      </Card>

      <SectionTitle>Appearance and language</SectionTitle>
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3"><span className="font-semibold">Theme</span><ThemeToggle /></div>
        <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 font-semibold"><Languages size={18} aria-hidden="true" /> Language</span>
          <select aria-label="Language" className="min-h-11 rounded-2xl border border-line bg-surface px-3 text-sm" defaultValue="en" disabled>{LOCALES.map((l) => <option key={l.id} value={l.id}>{l.label}{l.ready ? "" : " (soon)"}</option>)}</select></div>
      </Card>

      <SectionTitle>Coming soon</SectionTitle>
      <div className="space-y-3">
        {SOON.map(({ icon: Icon, title, body, toggle }) => (
          <Card key={title} className="flex items-center gap-3 p-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brandsoft text-brand"><Icon size={20} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1"><div className="font-semibold">{title}</div><p className="text-sm text-muted">{body}</p></div>
            {toggle ? <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" disabled aria-label={`${title} (coming soon)`} className="size-5" /> Soon</label> : <Badge>Coming soon</Badge>}
          </Card>
        ))}
        <Card className="flex items-center gap-3 p-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brandsoft text-brand"><Building2 size={20} aria-hidden="true" /></span><div className="min-w-0 flex-1"><div className="font-semibold">Circlo for campuses and clubs</div><p className="text-sm text-muted">B2B SaaS: treasury tools and reports for institutions. Roadmap.</p></div><Badge>Roadmap</Badge></Card>
        <Card className="flex items-center gap-3 p-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brandsoft text-brand"><Map size={20} aria-hidden="true" /></span><div className="min-w-0 flex-1"><div className="font-semibold">Option B: licensed NBFC-P2P</div><p className="text-sm text-muted">Longer-term path: run as a licensed P2P lender. Option A (partnered) and Closed mode are what this prototype simulates.</p></div><Badge>Roadmap</Badge></Card>
      </div>

      <SectionTitle>Platform</SectionTitle>
      <Card className="divide-y divide-line p-0">
        {[["/admin", "Pilot metrics", BarChart3], ["/admin/revenue", "Revenue", TrendingUp], ["/admin/projections", "Projections (illustrative)", Rocket]].map(([href, label, Icon]) => {
          const I = Icon as typeof BarChart3;
          return <Link key={href as string} href={href as string} className="flex min-h-14 items-center justify-between gap-3 px-5 hover:bg-surface2"><span className="flex items-center gap-3 font-semibold"><I size={18} aria-hidden="true" /> {label as string}</span><ChevronRight size={18} className="text-muted" aria-hidden="true" /></Link>;
        })}
      </Card>

      <SectionTitle>Learn and legal</SectionTitle>
      <div className="grid gap-2 sm:grid-cols-2 text-sm font-semibold">
        {[["/learn/how-circles-work", "How circles work"], ["/learn/risk-sharing", "How risk sharing works"], ["/learn/where-your-money-stays", "Where your money stays"], ["/legal/terms", "Terms of use (placeholder)"], ["/legal/privacy", "Privacy policy (placeholder)"]].map(([h, l]) => <Link key={h} href={h} className="flex min-h-12 items-center justify-between rounded-2xl border border-line bg-surface px-4 hover:border-brand">{l}<ChevronRight size={16} aria-hidden="true" /></Link>)}
      </div>

      <SectionTitle>Feedback</SectionTitle>
      <Card><NpsWidget /></Card>

      <SectionTitle>Demo tools</SectionTitle>
      <Card><p className="mb-3 text-sm text-muted">Switch between the seeded demo people to see each side of the story.</p><PersonaButtons compact /><div className="mt-4"><LogoutButton /></div></Card>
      <Notice className="mt-5">Circlo is a prototype. No real money moves, and identity and UPI steps are simulated.</Notice>
    </div>
  );
}
