import { ArrowDownLeft, ArrowUpRight, Ban, Coins, Percent, Receipt, RotateCcw, Wallet } from "lucide-react";
import { Badge } from "@/components/ui";
import { formatINR } from "@/lib/domain/money";
import { fmtDateTime } from "@/lib/utils";

export const LEDGER_META: Record<string, { label: string; icon: typeof Wallet; sign: 1 | -1 | 0 }> = {
  CONTRIBUTION: { label: "Contribution", icon: ArrowDownLeft, sign: 1 },
  DISBURSEMENT: { label: "Loan paid out", icon: ArrowUpRight, sign: -1 },
  REPAY_PRINCIPAL: { label: "Principal repaid", icon: ArrowDownLeft, sign: 1 },
  REPAY_INTEREST: { label: "Interest paid", icon: Percent, sign: 1 },
  PENALTY: { label: "Late penalty", icon: Receipt, sign: 1 },
  PLATFORM_FEE: { label: "Platform fee", icon: Coins, sign: 0 },
  WRITE_OFF: { label: "Written off", icon: Ban, sign: 0 },
  REVERSAL: { label: "Reversal", icon: RotateCcw, sign: 0 },
};

export interface LedgerRowData {
  id: string; ref: string; type: string; amount: number; status: string; memo: string | null; createdAt: Date; circleName?: string; actorName?: string;
}

export function LedgerRow({ r }: { r: LedgerRowData }) {
  const m = LEDGER_META[r.type] ?? { label: r.type, icon: Wallet, sign: 0 as const };
  const Icon = m.icon;
  const failed = r.status === "failed";
  return (
    <li className="flex items-center gap-3 py-3 md:py-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface2 text-muted" aria-hidden="true"><Icon size={18} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <span className="text-[15px] font-medium md:text-sm">{m.label}</span>
          {failed && <Badge tone="neg">Failed</Badge>}
          {r.status === "pending" && <Badge tone="warn">Pending</Badge>}
        </div>
        <div className="truncate text-xs text-muted">{[r.circleName, r.actorName, fmtDateTime(r.createdAt)].filter(Boolean).join(" · ")}</div>
        {r.memo && <div className="truncate text-xs text-muted">{r.memo}</div>}
        <div className="num text-[11px] text-muted">{r.ref}</div>
      </div>
      <div className={`num text-right font-semibold ${failed ? "text-muted line-through" : m.sign > 0 ? "text-pos" : ""}`}>
        {m.sign > 0 ? "+" : m.sign < 0 ? "-" : ""}{formatINR(r.amount, { showPaise: true })}
      </div>
    </li>
  );
}
