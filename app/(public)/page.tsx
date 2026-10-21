import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Banknote, HeartHandshake, Landmark, ScrollText, ShieldCheck, Users, Vote } from "lucide-react";
import { getCtx } from "@/lib/session";
import { APP_NAME, APP_ONE_LINER, APP_TAGLINE } from "@/lib/config";
import { Card, LinkButton, SectionTitle, Wordmark } from "@/components/ui";
import { MemberRing } from "@/components/client/ring";
import { PersonaButtons } from "@/components/client/persona-buttons";
import { ProtoRibbon } from "@/components/proto-ribbon";
import { RISK_DISCLOSURE } from "@/lib/domain/constants";

export default async function Welcome() {
  const { user } = await getCtx();
  if (user) redirect("/home");
  const demo = ["Ananya R", "Vikram S", "Imran S", "Priya M", "Neha K", "Kavya N", "Rohan V", "Sneha I"].map((name, i) => ({ name, admin: i === 1 }));
  return (
    <>
      <ProtoRibbon />
      <main id="main" className="relative mx-auto max-w-5xl overflow-hidden px-5 pb-16 pt-6 sm:px-8">
        <div className="blob -right-24 -top-24 size-72 bg-accent/40" aria-hidden="true" />
        <div className="blob -left-32 top-80 size-80 bg-brand/25" aria-hidden="true" />

        <header className="relative flex items-center justify-between">
          <Wordmark name={APP_NAME} />
          <Link href="/login" className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold hover:bg-surface2">Log in</Link>
        </header>

        <section className="relative grid items-center gap-8 py-10 md:grid-cols-2 md:py-16">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-onaccent">{APP_TAGLINE}</p>
            <h1 className="font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">Lend to the people you already trust.</h1>
            <p className="mt-4 max-w-md text-base text-muted sm:text-lg">{APP_ONE_LINER}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LinkButton href="/signup" size="lg">Get started <ArrowRight size={18} aria-hidden="true" /></LinkButton>
              <LinkButton href="/learn/how-circles-work" variant="ghost" size="lg">How circles work</LinkButton>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted"><ShieldCheck size={16} className="text-pos" aria-hidden="true" /> Your money stays in your bank account. We only keep the ledger.</p>
          </div>
          <div className="flex justify-center">
            <MemberRing members={demo} size={290} center={<div><div className="text-xs font-medium text-muted">A circle of 8</div><div className="num font-display text-2xl font-bold">₹48,835</div><div className="text-xs text-muted">logical pool</div></div>} />
          </div>
        </section>

        <section aria-labelledby="try" className="relative rounded-3xl border border-line bg-surface p-5 sm:p-6">
          <h2 id="try" className="font-display text-lg font-semibold">Try the demo in one tap</h2>
          <p className="mb-4 text-sm text-muted">Pick a seeded person to explore. Any 6-digit code works as the OTP; the demo code is 123456.</p>
          <PersonaButtons />
        </section>

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
                <div className="mb-3 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-brandsoft text-brand"><Icon size={20} aria-hidden="true" /></span><span className="num text-sm font-bold text-muted">0{i + 1}</span></div>
                <h3 className="font-display font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted">{b}</p>
              </Card>
            </li>
          ))}
        </ol>

        <SectionTitle>Why a circle</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <h3 className="mb-3 flex items-center gap-2 font-display font-semibold"><HeartHandshake size={20} className="text-brand" aria-hidden="true" /> If you borrow</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li><strong className="text-fg">Community rates.</strong> 8-12% a year, agreed by your circle, not the most a market will charge.</li>
              <li><strong className="text-fg">Faster than a bank.</strong> Peer approval and minimal paperwork.</li>
              <li><strong className="text-fg">Social accountability.</strong> You borrow from people you know, not a faceless app.</li>
              <li><strong className="text-fg">Flexible terms.</strong> The circle can restructure if life gets in the way.</li>
            </ul>
          </Card>
          <Card>
            <h3 className="mb-3 flex items-center gap-2 font-display font-semibold"><ScrollText size={20} className="text-brand" aria-hidden="true" /> If you lend</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li><strong className="text-fg">Modest, transparent interest</strong> on money that would sit idle.</li>
              <li><strong className="text-fg">Community impact.</strong> Help peers and build financial inclusion.</li>
              <li><strong className="text-fg">Control and transparency.</strong> The group decides; the ledger shows everything.</li>
              <li><strong className="text-fg">Low entry barrier.</strong> Start with ₹500. You do not need to be a big investor.</li>
            </ul>
          </Card>
        </div>

        <Card className="mt-6 bg-brandsoft">
          <h3 className="flex items-center gap-2 font-display font-semibold"><ShieldCheck size={20} className="text-brand" aria-hidden="true" /> Connector and ledger, never a fund holder</h3>
          <p className="mt-1 text-sm text-muted">There is no wallet and no “add money to app”. The pool balance is a logical number we track. Real money moves bank to bank by UPI. <Link href="/learn/where-your-money-stays" className="font-semibold text-brand underline">See how</Link>.</p>
        </Card>

        <p className="mt-8 text-center text-xs text-muted">{RISK_DISCLOSURE} <Link href="/legal/terms" className="underline">Terms</Link> · <Link href="/legal/privacy" className="underline">Privacy</Link></p>
      </main>
    </>
  );
}
