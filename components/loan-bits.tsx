import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import { PURPOSES } from "@/lib/config";
import { formatINR } from "@/lib/domain/money";
import type { DisplayStatus } from "@/lib/core/loans";

export const STATUS: Record<DisplayStatus, { label: string; tone: "neutral" | "brand" | "pos" | "warn" | "neg" | "accent" }> = {
  voting: { label: "Voting", tone: "brand" },
  approved: { label: "Approved, awaiting UPI", tone: "accent" },
  repaying: { label: "Repaying", tone: "pos" },
  overdue: { label: "Overdue", tone: "neg" },
  restructured: { label: "Restructured", tone: "warn" },
  closed: { label: "Closed", tone: "neutral" },
  defaulted: { label: "Defaulted", tone: "neg" },
  rejected: { label: "Not approved", tone: "neutral" },
};

export const purposeLabel = (id: string) => PURPOSES.find((p) => p.id === id)?.label.split(" (")[0] ?? id;

export function StatusBadge({ status }: { status: DisplayStatus }) {
  const s = STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function LoanListItem({ href, borrowerName, circleName, amount, purpose, status, extra, bare }: {
  bare?: boolean; href: string; borrowerName: string; circleName: string; amount: number; purpose: string; status: DisplayStatus; extra?: React.ReactNode;
}) {
  return (
    <Link href={href} className={bare ? "flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-surface2" : "flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition hover:bg-surface2"}>
      <Avatar name={borrowerName} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-[15px] font-medium md:text-sm">{borrowerName}</span>
          <StatusBadge status={status} />
        </div>
        <div className="truncate text-sm text-muted">{purposeLabel(purpose)} · {circleName}</div>
        {extra && <div className="mt-0.5 text-xs text-muted">{extra}</div>}
      </div>
      <div className="text-right">
        <div className="num font-semibold">{formatINR(amount)}</div>
        <ChevronRight size={16} className="ml-auto text-muted" aria-hidden="true" />
      </div>
    </Link>
  );
}
