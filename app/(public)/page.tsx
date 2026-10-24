import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Banknote, BadgeCheck, Check, CircleCheck, FileCheck2, HandCoins, Landmark, Lock, PiggyBank, TrendingUp, UserCheck, UserPlus, Users, Vote, ShieldCheck } from "lucide-react";
import { getCtx } from "@/lib/session";
import { APP_NAME, APP_ONE_LINER, APP_TAGLINE } from "@/lib/config";
import { Avatar, CircleIcon, Delta, KeyValue, LinkButton, Sparkline, Wordmark } from "@/components/ui";
import { PersonaButtons } from "@/components/client/persona-buttons";
import { ProtoRibbon } from "@/components/proto-ribbon";
import { RISK_DISCLOSURE } from "@/lib/domain/constants";

const STATS = [
  { v: "₹500", l: "to start contributing", Icon: PiggyBank },
  { v: "8–12%", l: "a year, simple interest", Icon: TrendingUp },
  { v: "70%", l: "of members approve a loan", Icon: BadgeCheck },
  { v: "₹0", l: "held in any wallet", Icon: Lock },
];

/* Sample activity for the ticker. Clearly labelled as sample data in the UI. */
const TICKER = [
  { Icon: CircleCheck, t: "Instalment repaid on time", v: "₹2,066" },
  { Icon: BadgeCheck, t: "Loan approved by circle", v: "₹5,000" },
  { Icon: Users, t: "New circle formed", v: "Hostel Block C" },
  { Icon: HandCoins, t: "Lent over UPI", v: "₹1,500" },
  { Icon: UserCheck, t: "eKYC verified", v: "Kavya" },
  { Icon: TrendingUp, t: "Robotics Club pool", v: "₹32,500", up: true },
  { Icon: FileCheck2, t: "Loan closed, 0 days late", v: "₹8,000" },
  { Icon: UserPlus, t: "Member joined", v: "Gachibowli Hostel Gang" },
];

const CAPITAL_CURVE = [10, 12, 11, 15, 14, 19, 18, 24, 23, 29, 31, 38];

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
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold shadow-sm"><span className="size-2 animate-pulse rounded-full bg-pos" aria-hidden="true" /> {APP_TAGLINE}</p>
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
              {[...TICKER, ...TICKER].map(({ Icon, t, v, up }, i) => (
                <span key={i} className="mx-2 inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"><Icon size={15} className="text-brand" />{t}<span className="num font-semibold">{v}</span>{up && <Delta pct={1.5} className="text-xs" />}</span>
              ))}
            </div>
            <span className="sr-only">Sample activity: {TICKER.map((x) => `${x.t} ${x.v}`).join(". ")}</span>
          </div>
          <p className="mt-1.5 text-right text-[11px] text-muted">Sample activity, not real people.</p>

          <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Circlo at a glance">
            {STATS.map((s) => (
              <li key={s.l} className="lift rounded-2xl border border-line bg-surface p-4"><span className="flex size-9 items-center justify-center rounded-lg bg-brandsoft text-brand"><s.Icon size={18} aria-hidden="true" /></span><div className="num font-display mt-3 text-3xl font-bold tracking-tight">{s.v}</div><div className="text-xs text-muted">{s.l}</div></li>
            ))}
          </ul>

          <section className="mt-16 grid items-center gap-10 lg:grid-cols-2" aria-labelledby="folio">
            <div>
              <p className="text-sm font-semibold text-accent">Built like a portfolio</p>
              <h2 id="folio" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">See your circle&apos;s money at a glance.</h2>
              <p className="mt-3 max-w-md text-muted">Capital, what is lent out, who is on time. Clear numbers and a ledger you can export, the way you would track any investment.</p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {["Live balance split between available and lent out", "Append-only ledger: nothing is edited or deleted", "A risk score for every request, with the reasons"].map((t) => <li key={t} className="flex items-start gap-2.5"><span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-possoft text-pos"><Check size={13} aria-hidden="true" /></span>{t}</li>)}
              </ul>
            </div>
            <div className="mx-auto w-full max-w-md rounded-3xl border border-line bg-surface p-5 shadow-[0_24px_60px_-30px_rgba(20,24,40,0.45)]" aria-hidden="true">
              <div className="flex items-center gap-3"><CircleIcon name="Gachibowli Hostel Gang" size={40} /><div><div className="font-display font-semibold">Gachibowli Hostel Gang</div><div className="text-xs text-muted">5 members · Hyderabad</div></div></div>
              <div className="mt-5 text-xs text-muted">Total capital</div>
              <div className="flex items-baseline gap-2"><span className="num font-display text-3xl font-bold">₹38,741</span><Delta pct={1.5} /><span className="text-xs text-muted">annualised yield</span></div>
              <div className="mt-3 -mx-1"><Sparkline values={CAPITAL_CURVE} width={330} height={84} up /></div>
              <div className="mt-1 flex gap-1.5">{["1M", "3M", "6M", "1Y"].map((r, i) => <span key={r} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${i === 2 ? "bg-brandsoft text-brand" : "text-muted"}`}>{r}</span>)}</div>
              <div className="mt-4 border-t border-line pt-3"><KeyValue rows={[{ k: "Available to lend", v: "₹28,241" }, { k: "Lent out (2 loans)", v: "₹10,500" }, { k: "On-time repayment", v: "60%" }]} /></div>
            </div>
          </section>

          <h2 className="mt-16 text-3xl font-bold tracking-tight sm:text-4xl">Four steps. Zero bank queues.</h2>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Users, t: "Form a circle", b: "Invite verified friends, classmates or teammates. Set the rules together.", g: "bg-brandsoft text-brand" },
              { icon: Banknote, t: "Pool small amounts", b: "₹500 to ₹5,000 at a time, tracked in a shared ledger.", g: "bg-accentsoft text-accent" },
              { icon: Vote, t: "Vote on loans", b: "Requests need your circle's approval, 70% by default.", g: "bg-brandsoft text-brand" },
              { icon: Landmark, t: "Pay by UPI", b: "Lender to borrower, directly. The app records it.", g: "bg-accentsoft text-accent" },
            ].map(({ icon: Icon, t, b, g }, i) => (
              <li key={t} className="lift rounded-2xl border border-line bg-surface p-5">
                <div className="mb-4 flex items-center justify-between"><span className={`flex size-11 items-center justify-center rounded-xl ${g}`}><Icon size={22} aria-hidden="true" /></span><span className="num font-display text-2xl font-bold text-line">0{i + 1}</span></div>
                <h3 className="text-lg font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted">{b}</p>
              </li>
            ))}
          </ol>

          <div className="mt-16 grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl border border-line bg-surface p-6">
              <h3 className="text-xl font-semibold">If you borrow</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li><strong className="text-fg">Community rates.</strong> 8-12% a year, agreed by your circle.</li>
                <li><strong className="text-fg">Faster than a bank.</strong> Peer approval and minimal paperwork.</li>
                <li><strong className="text-fg">Social accountability.</strong> You borrow from people you know.</li>
                <li><strong className="text-fg">Flexible terms.</strong> The circle can restructure if life happens.</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-line bg-surface p-6">
              <h3 className="text-xl font-semibold">If you lend</h3>
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
