import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Banknote, Check, Landmark, ShieldCheck, Users, Vote, X } from "lucide-react";
import { getCtx } from "@/lib/session";
import { APP_NAME, APP_ONE_LINER, APP_TAGLINE } from "@/lib/config";
import { Avatar, LinkButton, Sparkline, Wordmark } from "@/components/ui";
import { PersonaButtons } from "@/components/client/persona-buttons";
import { ProtoRibbon } from "@/components/proto-ribbon";
import { RISK_DISCLOSURE } from "@/lib/domain/constants";

const STATS = [
  { v: "₹500", l: "to start contributing", e: "🌱" },
  { v: "8–12%", l: "a year, simple interest", e: "📈" },
  { v: "70%", l: "of members approve a loan", e: "🗳️" },
  { v: "₹0", l: "held in any wallet", e: "🔒" },
];

/* Sample activity for the ticker. Clearly labelled as sample data in the UI. */
const TICKER = [
  "🔥 Ananya repaid ₹2,066 on time",
  "🗳️ Vote passed: ₹5,000 for gadgets, 4 of 5 said yes",
  "🏠 New circle: Hostel Block C just started",
  "💸 Vikram lent ₹1,500 over UPI",
  "✅ Kavya finished eKYC",
  "📈 Robotics Club pool crossed ₹32,500",
  "🎉 Imran closed a loan, 0 days late",
  "🤝 Meera joined Gachibowli Hostel Gang",
];

const LEDGER_CURVE = [10, 12, 11, 15, 14, 19, 18, 24, 23, 29, 31, 38];

export default async function Welcome() {
  const { user } = await getCtx();
  if (user) redirect("/home");
  return (
    <>
      <ProtoRibbon />
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" aria-label={`${APP_NAME} home`}><Wordmark name={APP_NAME} size={30} /></Link>
          <nav aria-label="Site" className="hidden items-center gap-1 text-sm font-medium text-muted md:flex">
            {[["/learn/how-circles-work", "How it works"], ["/learn/risk-sharing", "Risk sharing"], ["/learn/where-your-money-stays", "Your money"]].map(([h, l]) => (
              <Link key={h} href={h} className="rounded-full px-3.5 py-2 hover:bg-surface2 hover:text-fg">{l}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold hover:bg-surface2 md:min-h-9">Log in</Link>
            <LinkButton href="/signup" size="sm" className="!rounded-full">Sign up</LinkButton>
          </div>
        </div>
      </header>

      <div className="bg-mesh overflow-x-clip">
        <main id="main" className="mx-auto max-w-6xl px-4 pb-16">
          <section className="grid items-start gap-10 py-10 md:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
            <div className="lg:pt-6">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold shadow-sm"><span className="size-2 animate-pulse rounded-full bg-pos" aria-hidden="true" /> {APP_TAGLINE} ✨</p>
              <h1 className="text-[2.6rem] font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.2rem]">
                Lend to the people you <span className="grad-text">already trust.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base text-muted sm:text-lg">{APP_ONE_LINER}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <LinkButton href="/signup" size="lg" className="!rounded-full glow">Start a circle <ArrowRight size={18} aria-hidden="true" /></LinkButton>
                <LinkButton href="/learn/how-circles-work" variant="ghost" size="lg" className="!rounded-full">How circles work</LinkButton>
              </div>
              <div className="mt-7 flex items-center gap-3">
                <div className="flex -space-x-2" aria-hidden="true">{["Ananya", "Vikram", "Imran", "Kavya", "Meera"].map((n) => <Avatar key={n} name={n} size={32} className="ring-2 ring-bg" />)}</div>
                <p className="text-sm text-muted">Friends, hostel mates, club teams. <span className="font-semibold text-fg">Everyone you can text.</span></p>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted"><ShieldCheck size={16} className="text-pos" aria-hidden="true" /> Your money stays in your bank account. We only keep the ledger.</p>
            </div>

            <section aria-labelledby="try" className="rounded-3xl border border-line bg-surface p-5 shadow-[0_24px_60px_-28px_rgba(80,60,200,0.35)] md:p-6">
              <div className="mb-1 flex items-center justify-between gap-3">
                <h2 id="try" className="text-xl font-semibold">Try the demo in one tap</h2>
                <span className="rounded-full bg-accentsoft px-2.5 py-1 text-[11px] font-semibold text-accent">No signup</span>
              </div>
              <p className="mb-4 text-sm text-muted">Pick a seeded person to explore. Any 6-digit code works as the OTP; the demo code is 123456.</p>
              <PersonaButtons />
              <p className="mt-4 text-center text-sm text-muted">Or <Link href="/login" className="font-semibold text-brand hover:underline">log in</Link> · <Link href="/signup" className="font-semibold text-brand hover:underline">create an account</Link></p>
            </section>
          </section>

          <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden border-y border-line bg-surface/70 py-3" role="region" aria-label="Sample activity">
            <div className="marquee" aria-hidden="true">
              {[...TICKER, ...TICKER].map((t, i) => <span key={i} className="mx-3 whitespace-nowrap rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium">{t}</span>)}
            </div>
            <span className="sr-only">Sample activity: {TICKER.join(". ")}</span>
          </div>
          <p className="mt-1.5 text-right text-[11px] text-muted">Sample activity, not real people.</p>

          <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Circlo at a glance">
            {STATS.map((s) => (
              <li key={s.l} className="lift rounded-2xl border border-line bg-surface p-4"><div className="text-xl" aria-hidden="true">{s.e}</div><div className="num font-display mt-1 text-3xl font-bold tracking-tight">{s.v}</div><div className="text-xs text-muted">{s.l}</div></li>
            ))}
          </ul>

          <section className="mt-16 grid items-center gap-10 lg:grid-cols-2" aria-labelledby="vote">
            <div>
              <p className="text-sm font-semibold text-accent">Loans, but your friends decide</p>
              <h2 id="vote" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Every loan is a live vote.</h2>
              <p className="mt-3 max-w-md text-muted">A request goes to the circle. Members see the amount, the purpose and the borrower&apos;s track record, then vote. At 70% yes it goes ahead and lenders pay by UPI. No black box.</p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {["See who voted and what is still needed", "A risk score for every request, with the reasons", "Lenders share any loss fairly, never silently"].map((t) => <li key={t} className="flex items-start gap-2.5"><span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-possoft text-pos"><Check size={13} aria-hidden="true" /></span>{t}</li>)}
              </ul>
            </div>
            <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
              <div className="rounded-3xl border border-line bg-surface p-5 shadow-[0_24px_60px_-28px_rgba(20,24,40,0.4)]">
                <div className="flex items-center gap-3"><Avatar name="Sneha Iyer" size={40} /><div className="min-w-0 flex-1"><div className="font-display font-semibold">Will the circle fund Sneha?</div><div className="text-xs text-muted">₹5,000 · Gadgets · 3 months · 10% a year</div></div><span className="rounded-full bg-warnsoft px-2.5 py-1 text-[11px] font-semibold text-warn">21h left</span></div>
                <div className="mt-5 flex items-end justify-between"><div><div className="num font-display text-4xl font-bold text-pos">78%</div><div className="text-xs text-muted">say yes, 70% needed</div></div><div className="text-right text-xs text-muted">4 of 5 voted<br />Risk 82/100 · Low</div></div>
                <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-negsoft"><div className="fill-bar h-full rounded-full bg-gradient-to-r from-[#00b386] to-[#2fd4a0]" style={{ width: "78%" }} /><span className="absolute inset-y-0 w-0.5 bg-fg/60" style={{ left: "70%" }} /></div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-possoft font-semibold text-pos"><Check size={18} /> Yes</span>
                  <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-negsoft font-semibold text-neg"><X size={18} /> Pass</span>
                </div>
              </div>
              <div className="floaty absolute -right-3 -top-5 hidden rounded-2xl border border-line bg-surface p-3 shadow-lg sm:block" style={{ ["--r" as string]: "4deg" }}>
                <div className="text-[11px] text-muted">Circle capital</div><div className="num font-display text-lg font-bold">₹38,741</div><Sparkline values={LEDGER_CURVE} width={92} height={28} up />
              </div>
            </div>
          </section>

          <h2 className="mt-16 text-3xl font-bold tracking-tight sm:text-4xl">Four steps. Zero bank queues.</h2>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Users, t: "Form a circle", b: "Invite verified friends, classmates or teammates. Set the rules together.", g: "from-[#00b386] to-[#0a8f7a]" },
              { icon: Banknote, t: "Pool small amounts", b: "₹500 to ₹5,000 at a time, tracked in a shared ledger.", g: "from-[#4a5af0] to-[#7c5cff]" },
              { icon: Vote, t: "Vote on loans", b: "Requests need your circle's approval, 70% by default.", g: "from-[#ff5fa2] to-[#ff8a4c]" },
              { icon: Landmark, t: "Pay by UPI", b: "Lender to borrower, directly. The app records it.", g: "from-[#ffb020] to-[#ff7a1a]" },
            ].map(({ icon: Icon, t, b, g }, i) => (
              <li key={t} className="lift rounded-2xl border border-line bg-surface p-5">
                <div className="mb-4 flex items-center justify-between"><span className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${g} text-white`}><Icon size={22} aria-hidden="true" /></span><span className="num font-display text-2xl font-bold text-line">0{i + 1}</span></div>
                <h3 className="text-lg font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted">{b}</p>
              </li>
            ))}
          </ol>

          <div className="mt-16 grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl border border-line bg-surface p-6">
              <h3 className="text-xl font-semibold">🎒 If you borrow</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li><strong className="text-fg">Community rates.</strong> 8-12% a year, agreed by your circle.</li>
                <li><strong className="text-fg">Faster than a bank.</strong> Peer approval and minimal paperwork.</li>
                <li><strong className="text-fg">Social accountability.</strong> You borrow from people you know.</li>
                <li><strong className="text-fg">Flexible terms.</strong> The circle can restructure if life happens.</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-line bg-surface p-6">
              <h3 className="text-xl font-semibold">💼 If you lend</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li><strong className="text-fg">Modest, transparent interest</strong> on money that would sit idle.</li>
                <li><strong className="text-fg">Community impact.</strong> Help peers, build financial inclusion.</li>
                <li><strong className="text-fg">Control and transparency.</strong> The ledger shows everything.</li>
                <li><strong className="text-fg">Low entry barrier.</strong> Start with ₹500.</li>
              </ul>
            </div>
          </div>

          <section className="grad-hero mt-6 rounded-3xl p-6 md:p-8">
            <h3 className="flex items-center gap-2 text-xl font-semibold"><ShieldCheck size={22} aria-hidden="true" /> Connector and ledger, never a fund holder</h3>
            <p className="mt-2 max-w-2xl text-sm text-white/90">There is no wallet and no “add money to app”. The pool balance is a logical number we track. Real money moves bank to bank by UPI. <Link href="/learn/where-your-money-stays" className="font-semibold underline">See how</Link>.</p>
          </section>
        </main>
      </div>

      <footer className="border-t border-line bg-surface2">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
          <div><Wordmark name={APP_NAME} size={26} /><p className="mt-2 max-w-xs text-xs text-muted">{APP_TAGLINE}. A prototype: UPI, eKYC and partner steps are simulated.</p></div>
          <nav aria-label="Learn" className="space-y-1.5"><div className="font-semibold">Learn</div>{[["/learn/how-circles-work", "How circles work"], ["/learn/risk-sharing", "Risk sharing"], ["/learn/where-your-money-stays", "Where your money stays"]].map(([h, l]) => <Link key={h} href={h} className="block text-muted hover:text-fg">{l}</Link>)}</nav>
          <nav aria-label="Legal" className="space-y-1.5"><div className="font-semibold">Legal</div><Link href="/legal/terms" className="block text-muted hover:text-fg">Terms</Link><Link href="/legal/privacy" className="block text-muted hover:text-fg">Privacy</Link><p className="pt-1 text-xs text-muted">{RISK_DISCLOSURE}</p></nav>
        </div>
      </footer>
    </>
  );
}
