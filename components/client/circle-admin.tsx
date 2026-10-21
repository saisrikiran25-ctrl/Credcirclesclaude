"use client";

import { useState, useTransition } from "react";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { LIMITS } from "@/lib/domain/constants";
import { formatINR } from "@/lib/domain/money";
import { regenerateInviteAction, removeMemberAction, setComplianceAction, updateRulesAction, upgradePremiumAction, cancelPremiumAction } from "@/lib/actions/circles";
import { btnClass, Notice } from "@/components/ui";
import { ActionButton } from "./action-button";
import { RupeeInput } from "./form-bits";
import { RulesFields, rulesFromCircle, rulesPayload, useRules } from "./rules-fields";
import { useToast } from "./toast";
import { cn } from "@/lib/utils";

export function RulesEditor({ circleId, circle }: { circleId: string; circle: Parameters<typeof rulesFromCircle>[0] }) {
  const [rules, setRules] = useRules(rulesFromCircle(circle));
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const { show } = useToast();
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(""); start(async () => {
      const r = await updateRulesAction(circleId, rulesPayload(rules));
      if (r.ok) show("Rules saved. They apply to new loan requests."); else { setError(r.error); show(r.error, "error"); }
    }); }}>
      <RulesFields value={rules} onChange={setRules} />
      {error && <p role="alert" className="text-sm font-medium text-neg">{error}</p>}
      <button type="submit" disabled={pending} className={btnClass("primary", "md", true)}>{pending && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} Save rules</button>
    </form>
  );
}

export function ComplianceToggle({ circleId, mode }: { circleId: string; mode: "A" | "C" }) {
  const opts = [
    { id: "A", title: "Mode A: Partnered", body: "Funds route through a regulated partner's escrow. Outside (vetted) borrowers allowed." },
    { id: "C", title: "Mode C: Closed", body: "Only members lend and borrow, all verified. Platform is software only." },
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Compliance mode">
      {opts.map((o) => (
        <div key={o.id} className={cn("rounded-2xl border-2 p-4", mode === o.id ? "border-brand bg-brandsoft" : "border-line")}>
          <div className="font-semibold">{o.title}</div>
          <p className="mb-3 mt-1 text-sm text-muted">{o.body}</p>
          {mode === o.id
            ? <span className="text-sm font-semibold text-brand">Active</span>
            : <ActionButton size="sm" variant="ghost" action={() => setComplianceAction(circleId, o.id)}>Switch to {o.id}</ActionButton>}
        </div>
      ))}
    </div>
  );
}

export function InvitePanel({ circleId, code, origin }: { circleId: string; code: string | null; origin: string }) {
  const { show } = useToast();
  if (!code) return null;
  const url = `${origin}/join/${code}`;
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface2 p-5 text-center sm:flex-row sm:text-left">
        <div className="rounded-2xl bg-white p-3"><QRCodeSVG value={url} size={120} title={`Invite link for code ${code}`} /></div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted">Invite code</div>
          <div className="num font-display text-4xl font-bold tracking-widest">{code}</div>
          <div className="mt-1 break-all text-xs text-muted">{url}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnClass("soft", "sm")} onClick={async () => { try { await navigator.clipboard.writeText(url); show("Link copied"); } catch { show("Copy not available. Select the link above.", "error"); } }}>
          <Copy size={16} aria-hidden="true" /> Copy link
        </button>
        <ActionButton size="sm" variant="ghost" confirm="Make a new code? The old code stops working." action={() => regenerateInviteAction(circleId)}>
          <RefreshCw size={16} aria-hidden="true" /> New code
        </ActionButton>
      </div>
      <Notice>Circles are invite-only and for verified members. Anyone joining with this code must complete eKYC first.</Notice>
    </div>
  );
}

export function RemoveMemberButton({ circleId, memberId, name }: { circleId: string; memberId: string; name: string }) {
  return <ActionButton size="sm" variant="ghost" confirm={`Remove ${name} from this circle?`} action={() => removeMemberAction(circleId, memberId)}>Remove</ActionButton>;
}

export function PremiumPanel({ circleId, active, price }: { circleId: string; active: boolean; price: number | null }) {
  const [rupees, setRupees] = useState(String((price ?? LIMITS.premiumDefault) / 100));
  const paise = Math.round(Number(rupees) * 100);
  const ok = paise >= LIMITS.premiumMin && paise <= LIMITS.premiumMax;
  return (
    <div className="space-y-3">
      {active && <p className="text-sm font-semibold text-pos">Circle Premium is on at {formatINR(price ?? 0)}/month.</p>}
      <RupeeInput label="Price per month" value={rupees} onChange={setRupees} min={50} max={200} step={10} hint="₹50 to ₹200 per month for the whole circle (simulated billing)." error={!ok ? "Choose between ₹50 and ₹200." : undefined} />
      <div className="flex flex-wrap gap-2">
        <ActionButton disabled={!ok} variant="accent" action={() => upgradePremiumAction(circleId, paise)}>{active ? "Update price" : "Start Premium"}</ActionButton>
        {active && <ActionButton variant="ghost" action={() => cancelPremiumAction(circleId)}>Cancel Premium</ActionButton>}
      </div>
    </div>
  );
}
