import Link from "next/link";
import { notFound } from "next/navigation";
import { Wordmark, LinkButton } from "@/components/ui";
import { APP_NAME } from "@/lib/config";
import { RISK_DISCLOSURE } from "@/lib/domain/constants";

const TOPICS: Record<string, { title: string; lead: string; sections: { h: string; p: string }[] }> = {
  "how-circles-work": {
    title: "How circles work",
    lead: "A circle is a small, invite-only group of verified people who pool trust, not cash.",
    sections: [
      { h: "1. Form a circle", p: "A friend, hostel or club admin creates a circle and sets the rules: the biggest loan, the interest rate (8 to 12% a year, simple), how many members must approve, and the late penalty. Everyone who joins agrees to those rules, and each member must pass identity verification first." },
      { h: "2. Contribute to the ledger", p: "Members commit ₹500 to ₹5,000 at a time. Your contribution is a record of what you are willing to lend. Your money stays in your bank account." },
      { h: "3. Ask, vote, lend", p: "A member asks for ₹5,000 to ₹20,000 for 1 to 6 months. Other members see the amount, the purpose and the borrower's risk score, and vote. When enough approve (70% by default), the lenders pay the borrower directly by UPI, each their own share." },
      { h: "4. Repay and earn", p: "The borrower repays by monthly instalments, ideally by UPI AutoPay. Interest goes to the lenders. If life gets in the way, the circle can restructure the loan and talk it through before anything harsher." },
      { h: "5. Everything is visible", p: "Every contribution, payout, repayment and fee is a line in an append-only ledger that members can see and export. Mistakes are fixed with a reversal entry, never by editing history." },
    ],
  },
  "risk-sharing": {
    title: "How risk sharing works",
    lead: "If a loan goes bad, the loss is shared, not dumped on one person.",
    sections: [
      { h: "Lenders share a default", p: "When the admin marks a loan as defaulted, the unpaid principal is written off. Each lender bears a share in proportion to what they lent. Lend ₹2,000 of a ₹10,000 loan and you carry 20% of any loss." },
      { h: "Small, spread-out loans", p: "To keep losses survivable, loans are capped, one borrower may only hold a recommended share of the pool, and nudges warn when money is concentrated on one person." },
      { h: "A guide, not a guarantee", p: "The risk score summarises repayment history, time on the platform, past approvals, current exposure and verification. A default on record caps the score at 49." },
      { h: "Be honest with yourself", p: RISK_DISCLOSURE },
    ],
  },
  "where-your-money-stays": {
    title: "Where your money stays",
    lead: "Circlo is a connector and a ledger. It does not hold wallets or pooled funds.",
    sections: [
      { h: "In your bank account", p: "When you contribute, you record a commitment and confirm it by UPI. The platform does not keep a balance for you." },
      { h: "Direct payments", p: "Lenders pay the borrower straight to the borrower's UPI ID. The borrower repays the lenders the same way, or through UPI AutoPay." },
      { h: "Two compliance modes", p: "Mode A (Partnered) routes funds through a regulated partner's escrow and allows vetted outside borrowers. Mode C (Closed) keeps things between verified members only, with the platform as software. In this prototype both are simulated and no real money moves." },
      { h: "What we charge", p: "A platform fee of 1.5% of the loan, paid by the borrower and never taken from the pool, and an optional Circle Premium of ₹50 to ₹200 a month." },
    ],
  },
};

export function generateStaticParams() { return Object.keys(TOPICS).map((topic) => ({ topic })); }

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  return { title: TOPICS[topic]?.title ?? "Learn" };
}

export default async function Learn({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const t = TOPICS[topic];
  if (!t) notFound();
  return (
    <main id="main" className="mx-auto max-w-2xl px-5 pb-16 pt-6">
      <header className="mb-8 flex items-center justify-between"><Link href="/" aria-label={`${APP_NAME} home`}><Wordmark name={APP_NAME} size={28} /></Link><Link href="/signup" className="inline-flex min-h-11 items-center rounded-full bg-brand px-4 text-sm font-semibold text-onbrand">Get started</Link></header>
      <h1 className="font-display text-4xl font-bold">{t.title}</h1>
      <p className="mt-2 text-lg text-muted">{t.lead}</p>
      <div className="mt-8 space-y-6">{t.sections.map((s) => <section key={s.h}><h2 className="font-display text-xl font-semibold">{s.h}</h2><p className="mt-1 text-muted">{s.p}</p></section>)}</div>
      <nav aria-label="More explainers" className="mt-10 flex flex-wrap gap-2">{Object.entries(TOPICS).filter(([k]) => k !== topic).map(([k, v]) => <LinkButton key={k} href={`/learn/${k}`} variant="ghost" size="sm">{v.title}</LinkButton>)}</nav>
    </main>
  );
}
