import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Banknote, HeartHandshake, Landmark, ScrollText, ShieldCheck, Users, Vote } from "lucide-react";
import { getCtx } from "@/lib/session";
import { APP_NAME, APP_ONE_LINER, APP_TAGLINE } from "@/lib/config";
import { Card, LinkButton, SectionTitle, Wordmark } from "@/components/ui";
import { PersonaButtons } from "@/components/client/persona-buttons";
import { ProtoRibbon } from "@/components/proto-ribbon";
import { RISK_DISCLOSURE } from "@/lib/domain/constants";

const STATS = [
  { v: "₹500", l: "to start contributing" },
  { v: "8–12%", l: "a year, simple interest" },
  { v: "70%", l: "of members approve a loan" },
  { v: "₹0", l: "held in any wallet" },
];

export default async function Welcome() {
  const { user } = await getCtx();
  if (user) redirect("/home");
  return (
    <>
      <ProtoRibbon />
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" aria-label={`${APP_NAME} home`}><Wordmark name={APP_NAME} size={28} /></Link>
          <nav aria-label="Site" className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
            <Link href="/learn/how-circles-work" className="hover:text-fg">How it works</Link>
            <Link href="/learn/risk-sharing" className="hover:text-fg">Risk sharing</Link>
            <Link href="/learn/where-your-money-stays" className="hover:text-fg">Your money</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold hover:bg-surface2 md:min-h-9">Log in</Link>
            <LinkButton href="/signup" size="sm">Sign up</LinkButton>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 pb-16">
        <section className="grid items-center gap-8 py-8 md:py-14 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="mb-3 inline-flex rounded-md bg-brandsoft px-2.5 py-1 text-xs font-semibold text-brand">{APP_TAGLINE}</p>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">Lend to the people you already trust.</h1>
            <p className="mt-4 max-w-lg text-base text-muted sm:text-lg">{APP_ONE_LINER}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LinkButton href="/signup" size="lg">Get started <ArrowRight size={18} aria-hidden="true" /></LinkButton>
              <LinkButton href="/learn/how-circles-work" variant="ghost" size="lg">How circles work</LinkButton>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted"><ShieldCheck size={16} className="text-pos" aria-hidden="true" /> Your money stays in your bank account. We only keep the ledger.</p>
          </div>
          <Card as="section" aria-labelledby="try" className="p-5 shadow-sm md:p-6">
            <h2 id="try" className="text-lg font-semibold">Try the demo in one tap</h2>
            <p className="mb-4 mt-1 text-sm text-muted">Pick a seeded person to explore. Any 6-digit code works as the OTP; the demo code is 123456.</p>
            <PersonaButtons />
            <p className="mt-4 text-center text-sm text-muted">Or <Link href="/login" className="font-semibold text-brand hover:underline">log in</Link> · <Link href="/signup" className="font-semibold text-brand hover:underline">create an account</Link></p>
          </Card>
        </section>

        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Circlo at a glance">
          {STATS.map((s) => (
            <li key={s.l} className="rounded-xl border border-line bg-surface p-4"><div className="num text-2xl font-semibold tracking-tight">{s.v}</div><div className="text-xs text-muted">{s.l}</div></li>
          ))}
        </ul>

        <SectionTitle>How it works</SectionTitle>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, t: "Form a circle", b: "Invite verified friends, classmates or teammates. Set the rules together." },
            { icon: Banknote, t: "Pool small amounts", b: "₹500 to ₹5,000 at a time, tracked in a shared ledger." },
            { icon: Vote, t: "Vote on loans", b: "Requests need your circle's approval, 70% by default." },
            { icon: Landmark, t: "Pay by UPI", b: "Lender to borrower, directly. The app records it." },
          ].map(({ icon: Icon, t, b }, i) => (
            <li key={t}>
              <Card className="h-full">
                <div className="mb-3 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-lg bg-brandsoft text-brand"><Icon size={20} aria-hidden="true" /></span><span className="num text-sm font-semibold text-muted">0{i + 1}</span></div>
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted">{b}</p>
              </Card>
            </li>
          ))}
        </ol>

        <SectionTitle>Why a circle</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <h3 className="mb-3 flex items-center gap-2 font-semibold"><HeartHandshake size={20} className="text-brand" aria-hidden="true" /> If you borrow</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li><strong className="text-fg">Community rates.</strong> 8-12% a year, agreed by your circle, not the most a market will charge.</li>
              <li><strong className="text-fg">Faster than a bank.</strong> Peer approval and minimal paperwork.</li>
              <li><strong className="text-fg">Social accountability.</strong> You borrow from people you know, not a faceless app.</li>
              <li><strong className="text-fg">Flexible terms.</strong> The circle can restructure if life gets in the way.</li>
            </ul>
          </Card>
          <Card>
            <h3 className="mb-3 flex items-center gap-2 font-semibold"><ScrollText size={20} className="text-brand" aria-hidden="true" /> If you lend</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li><strong className="text-fg">Modest, transparent interest</strong> on money that would sit idle.</li>
              <li><strong className="text-fg">Community impact.</strong> Help peers and build financial inclusion.</li>
              <li><strong className="text-fg">Control and transparency.</strong> The group decides; the ledger shows everything.</li>
              <li><strong className="text-fg">Low entry barrier.</strong> Start with ₹500. You do not need to be a big investor.</li>
            </ul>
          </Card>
        </div>

        <Card className="mt-6 !border-0 bg-brandsoft">
          <h3 className="flex items-center gap-2 font-semibold"><ShieldCheck size={20} className="text-brand" aria-hidden="true" /> Connector and ledger, never a fund holder</h3>
          <p className="mt-1 text-sm text-muted">There is no wallet and no “add money to app”. The pool balance is a logical number we track. Real money moves bank to bank by UPI. <Link href="/learn/where-your-money-stays" className="font-semibold text-brand hover:underline">See how</Link>.</p>
        </Card>
      </main>

      <footer className="border-t border-line bg-surface2">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
          <div><Wordmark name={APP_NAME} size={24} /><p className="mt-2 max-w-xs text-xs text-muted">{APP_TAGLINE}. A prototype: UPI, eKYC and partner steps are simulated.</p></div>
          <nav aria-label="Learn" className="space-y-1.5"><div className="font-semibold">Learn</div>{[["/learn/how-circles-work", "How circles work"], ["/learn/risk-sharing", "Risk sharing"], ["/learn/where-your-money-stays", "Where your money stays"]].map(([h, l]) => <Link key={h} href={h} className="block text-muted hover:text-fg">{l}</Link>)}</nav>
          <nav aria-label="Legal" className="space-y-1.5"><div className="font-semibold">Legal</div><Link href="/legal/terms" className="block text-muted hover:text-fg">Terms</Link><Link href="/legal/privacy" className="block text-muted hover:text-fg">Privacy</Link><p className="pt-1 text-xs text-muted">{RISK_DISCLOSURE}</p></nav>
        </div>
      </footer>
    </>
  );
}
