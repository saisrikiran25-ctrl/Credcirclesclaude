import { PROJECTIONS } from "@/lib/core/admin";
import { Badge, Notice, PageHeader } from "@/components/ui";

export const metadata = { title: "Projections" };

export default function Projections() {
  return (
    <div>
      <PageHeader title="Revenue projections" subtitle="Copied from the business description." action={<Badge tone="warn">Illustrative</Badge>} />
      <Notice tone="warn" title="Illustrative, not a forecast">These figures are assumptions from the plan, not results. Nothing here is measured from the pilot.</Notice>
      <div className="mt-4 overflow-x-auto rounded-3xl border border-line bg-surface">
        <table className="w-full min-w-[560px] text-sm">
          <caption className="sr-only">Three-year illustrative projection</caption>
          <thead><tr className="border-b border-line text-left text-xs text-muted">{["Year", "Circles", "Avg pool", "AUM", "Take rate", "Revenue"].map((h) => <th key={h} scope="col" className="p-3">{h}</th>)}</tr></thead>
          <tbody>{PROJECTIONS.map((p) => <tr key={p.year} className="border-b border-line last:border-0"><th scope="row" className="p-3 text-left font-semibold">{p.year}</th><td className="num p-3">{p.circles}</td><td className="num p-3">{p.avgPool}</td><td className="num p-3">{p.aum}</td><td className="num p-3">{p.takeRate}</td><td className="num p-3 font-semibold">{p.revenue}{p.year === "Year 1" && <sup> *</sup>}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">* Year 1 note: 1.5% of ₹50 lakh is ₹75,000, not ₹7.5 lakh. The business description's Year 1 revenue does not follow from its own inputs, while Years 2 and 3 do (2% of ₹10 cr = ₹20 lakh; 2% of ₹100 cr = ₹2 cr). It is shown as written and flagged here so nobody quotes it by mistake. Recorded in DECISIONS.md.</p>
    </div>
  );
}
