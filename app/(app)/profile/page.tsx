import Link from "next/link";
import { eq } from "drizzle-orm";
import { BadgeCheck, BarChart3, BookOpen, Building2, ChevronRight, FileText, Gauge, Languages, Map, PiggyBank, Rocket, Shield, Sprout, TrendingUp } from "lucide-react";
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

const Row = ({ href, icon: Icon, label, right }: { href: string; icon: typeof Shield; label: string; right?: React.ReactNode }) => (
  <Link href={href} className="flex min-h-14 items-center gap-3 px-4 transition hover:bg-surface2">
    <span className="flex size-9 items-center justify-center rounded-lg bg-surface2 text-muted"><Icon size={18} aria-hidden="true" /></span>
    <span className="flex-1 font-medium">{label}</span>{right}<ChevronRight size={16} className="text-muted" aria-hidden="true" />
  </Link>
);

export default async function Profile() {
  const { db, user, now } = await requireCtx();
  const kyc = db.select().from(schema.kycRecords).where(eq(schema.kycRecords.userId, user.id)).get();
  const risk = riskForUser(db, user.id, now);
  const seg = SEGMENTS.find((s) => s.id === user.segment)?.label ?? user.segment;
  return (
    <div>
      <PageHeader title="Profile" />
      <Card className="mb-2">
        <div className="flex items-center gap-4"><Avatar name={user.name} size={60} /><div className="min-w-0"><div className="text-lg font-semibold">{user.name}</div><div className="text-sm text-muted">{seg} · {user.city}{user.institution ? ` · ${user.institution}` : ""}</div><div className="num text-xs text-muted">+91 {user.phone} · joined {fmtDate(user.createdAt)}</div></div></div>
      </Card>
      <div className="grid gap-x-6 lg:grid-cols-2">
        <div className="min-w-0">
          <SectionTitle>Account</SectionTitle>
          <Card className="divide-y divide-line p-0 md:p-0">
            <div className="flex min-h-14 items-center justify-between gap-3 px-4"><span className="text-muted">UPI ID</span><span className="num font-medium">{user.vpa}</span></div>
            <div className="flex min-h-14 items-center justify-between gap-3 px-4"><span className="text-muted">Identity</span><span className="flex items-center gap-2 font-medium">{user.kycStatus === "verified" ? <><BadgeCheck size={18} className="text-pos" aria-hidden="true" /> Verified <span className="num text-xs font-normal text-muted">{kyc ? `${kyc.idType.toUpperCase()} ${kyc.maskedId}` : ""}</span></> : "Not verified"}</span></div>
            <Row href="/risk" icon={Gauge} label="Your risk score" right={<RiskBadge band={risk.band} score={risk.score} />} />
            <Row href="/position" icon={PiggyBank} label="My position" />
          </Card>

          <SectionTitle>Appearance and language</SectionTitle>
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3"><span className="font-medium">Theme</span><ThemeToggle /></div>
            <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 font-medium"><Languages size={18} aria-hidden="true" /> Language</span>
              <select aria-label="Language" className="min-h-11 rounded-xl border border-line bg-surface px-3 md:min-h-9" defaultValue="en" disabled>{LOCALES.map((l) => <option key={l.id} value={l.id}>{l.label}{l.ready ? "" : " (soon)"}</option>)}</select></div>
          </Card>

          <SectionTitle>Platform</SectionTitle>
          <Card className="divide-y divide-line p-0 md:p-0">
            <Row href="/admin" icon={BarChart3} label="Pilot metrics" />
            <Row href="/admin/revenue" icon={TrendingUp} label="Revenue" />
            <Row href="/admin/projections" icon={Rocket} label="Projections (illustrative)" />
          </Card>

          <SectionTitle>Learn and legal</SectionTitle>
          <Card className="divide-y divide-line p-0 md:p-0">
            <Row href="/learn/how-circles-work" icon={BookOpen} label="How circles work" />
            <Row href="/learn/risk-sharing" icon={Shield} label="How risk sharing works" />
            <Row href="/learn/where-your-money-stays" icon={Shield} label="Where your money stays" />
            <Row href="/legal/terms" icon={FileText} label="Terms of use (placeholder)" />
            <Row href="/legal/privacy" icon={FileText} label="Privacy policy (placeholder)" />
          </Card>
        </div>

        <div className="min-w-0">
          <SectionTitle>Coming soon</SectionTitle>
          <Card className="divide-y divide-line p-0 md:p-0">
            {[
              { icon: Sprout, title: "Auto-invest into circles", body: "A monthly amount that flows to your favourite circle.", toggle: true },
              { icon: TrendingUp, title: "Micro-investments", body: "Cross-sell: small SIPs for circle members.", toggle: false },
              { icon: Rocket, title: "Insurance and skilling", body: "Cross-sell: cover and courses from partners.", toggle: false },
              { icon: Building2, title: "Circlo for campuses and clubs", body: "B2B SaaS: treasury tools and reports.", toggle: false, roadmap: true },
              { icon: Map, title: "Option B: licensed NBFC-P2P", body: "Longer-term path as a licensed P2P lender.", toggle: false, roadmap: true },
            ].map(({ icon: Icon, title, body, toggle, roadmap }) => (
              <div key={title} className="flex min-h-16 items-center gap-3 px-4 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accentsoft text-accent"><Icon size={18} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1"><div className="font-medium">{title}</div><p className="text-xs text-muted">{body}</p></div>
                {toggle ? <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" disabled aria-label={`${title} (coming soon)`} className="size-5" /> Soon</label> : <Badge>{roadmap ? "Roadmap" : "Coming soon"}</Badge>}
              </div>
            ))}
          </Card>

          <SectionTitle>Feedback</SectionTitle>
          <Card><NpsWidget /></Card>

          <SectionTitle>Demo tools</SectionTitle>
          <Card><p className="mb-3 text-sm text-muted">Switch between the seeded demo people to see each side of the story.</p><PersonaButtons compact /><div className="mt-4"><LogoutButton /></div></Card>
          <Notice className="mt-4">Circlo is a prototype. No real money moves, and identity and UPI steps are simulated.</Notice>
        </div>
      </div>
    </div>
  );
}
