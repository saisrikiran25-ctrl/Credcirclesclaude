import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice, Wordmark } from "@/components/ui";
import { APP_NAME } from "@/lib/config";

const DOCS: Record<string, { title: string; items: string[] }> = {
  terms: {
    title: "Terms of use (placeholder)",
    items: [
      `${APP_NAME} is a prototype. It is not a bank, an NBFC or a registered lender, and no real money moves in this demo.`,
      "Members lend and borrow between themselves. Lending carries risk of loss. Only lend what you can afford to lose.",
      "Interest, penalties and fees are shown before you commit. Rules are set per circle and stored with each loan when it is requested.",
      "Platform fee: 1.5% of principal, paid by the borrower. Circle Premium: ₹50 to ₹200 a month, optional.",
      "[Placeholder: dispute resolution, governing law, grievance officer and regulatory disclosures to be completed by counsel.]",
    ],
  },
  privacy: {
    title: "Privacy policy (placeholder)",
    items: [
      "We keep your name, phone number, city, UPI ID and the last four characters of your ID. The full PAN or Aadhaar number is never stored.",
      "Circle members can see your name, verified badge and risk score. They cannot see your phone number or ID.",
      "Ledger entries are append-only records of money movements between members.",
      "[Placeholder: data retention, consent records, DPDP Act rights, grievance contact and breach process to be completed by counsel.]",
    ],
  },
};

export function generateStaticParams() { return Object.keys(DOCS).map((doc) => ({ doc })); }
export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) { const { doc } = await params; return { title: DOCS[doc]?.title ?? "Legal" }; }

export default async function Legal({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const d = DOCS[doc];
  if (!d) notFound();
  return (
    <main id="main" className="mx-auto max-w-2xl px-5 pb-16 pt-6">
      <header className="mb-8"><Link href="/" aria-label={`${APP_NAME} home`}><Wordmark name={APP_NAME} size={28} /></Link></header>
      <h1 className="text-3xl font-semibold tracking-tight">{d.title}</h1>
      <Notice tone="warn" className="my-5" title="Placeholder text">Not legal advice. Have a lawyer replace this before any real launch.</Notice>
      <ul className="list-disc space-y-3 pl-5 text-muted">{d.items.map((i) => <li key={i}>{i}</li>)}</ul>
    </main>
  );
}
