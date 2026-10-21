"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Loader2, QrCode, RotateCcw, ShieldCheck, X } from "lucide-react";
import { Sheet } from "./sheet";
import { Badge, btnClass } from "@/components/ui";
import { formatINR } from "@/lib/domain/money";
import { useToast } from "./toast";
import type { ActionResult } from "@/lib/actions/helpers";
import { cn } from "@/lib/utils";

type Phase = "idle" | "processing" | "success" | "failed";

/**
 * A mock "Pay with UPI" experience. In production the lender's own UPI app performs the payment
 * and the platform only records the confirmed event: the sheet makes that explicit.
 */
export function UpiSheet({
  open, onClose, title, payeeName, payeeVpa, amount, note, link, payAction, successText, doneHref, hint,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  payeeName: string;
  payeeVpa: string;
  amount: number;
  note: string;
  link?: string;
  payAction: (outcome: "success" | "failure") => Promise<ActionResult>;
  successText: string;
  doneHref?: string;
  hint?: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [err, setErr] = useState("");
  const [ref, setRef] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();
  const { show } = useToast();

  const run = (outcome: "success" | "failure") => {
    setPhase("processing");
    setErr("");
    start(async () => {
      const [r] = await Promise.all([payAction(outcome), new Promise((res) => setTimeout(res, 900))]);
      if (r.ok) {
        setRef(String(r.data?.upiRef ?? ""));
        setPhase("success");
      } else {
        setErr(r.error);
        setPhase("failed");
      }
    });
  };
  const close = () => {
    const wasSuccess = phase === "success";
    onClose();
    setTimeout(() => setPhase("idle"), 250);
    if (wasSuccess) {
      if (doneHref) router.push(doneHref);
      router.refresh();
    }
  };

  return (
    <Sheet open={open} onClose={close} title={title}>
      <div className="rounded-3xl bg-surface2 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-sm font-bold tracking-widest text-brand">UPI</span>
          <Badge tone="warn">Simulated, no real money</Badge>
        </div>

        {phase === "success" ? (
          <div className="flex flex-col items-center py-6 text-center" role="status">
            <div className="mb-3 flex size-20 items-center justify-center rounded-full bg-pos text-white [animation:pop-in_0.5s_ease-out]">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" style={{ strokeDasharray: 24, strokeDashoffset: 24, animation: "draw-check 0.5s 0.25s ease-out forwards" }} />
              </svg>
            </div>
            <div className="font-display text-xl font-semibold">{successText}</div>
            <div className="num mt-1 text-2xl font-bold">{formatINR(amount, { showPaise: true })}</div>
            {ref && <div className="mt-2 text-xs text-muted">UPI ref {ref}</div>}
            <p className="mt-3 text-xs text-muted">Recorded in the ledger. The money moved between bank accounts, not through {`Circlo`}.</p>
          </div>
        ) : (
          <>
            <div className="text-sm text-muted">Paying</div>
            <div className="font-semibold">{payeeName}</div>
            <div className="num text-xs text-muted">{payeeVpa}</div>
            <div className="num mt-3 font-display text-4xl font-bold">{formatINR(amount, { showPaise: true })}</div>
            <div className="mt-1 text-sm text-muted">Note: {note}</div>
            {hint && <div className="mt-2 text-xs text-muted">{hint}</div>}

            {link && (
              <div className="mt-4 rounded-2xl bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <code className="num min-w-0 flex-1 truncate text-xs text-muted" title={link}>{link}</code>
                  <button
                    type="button"
                    aria-label="Copy UPI link"
                    className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface2"
                    onClick={() => { navigator.clipboard?.writeText(link).then(() => show("UPI link copied")).catch(() => show("Could not copy", "error")); }}
                  >
                    <Copy size={18} />
                  </button>
                  <button type="button" aria-label="Show QR code" aria-pressed={showQr} className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface2" onClick={() => setShowQr((v) => !v)}>
                    <QrCode size={18} />
                  </button>
                </div>
                {showQr && (
                  <div className="mt-3 flex justify-center rounded-xl bg-white p-3">
                    <QRCodeSVG value={link} size={176} level="M" title="UPI payment QR code" />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {phase === "failed" && (
        <div role="alert" className="mt-3 flex items-start gap-2 rounded-2xl bg-negsoft p-3 text-sm">
          <X size={18} className="mt-0.5 shrink-0 text-neg" aria-hidden="true" />
          <div><strong>Payment failed.</strong> <span className="text-muted">{err} Nothing was recorded, so you can safely retry.</span></div>
        </div>
      )}

      <div className="mt-4 grid gap-2">
        {phase === "success" ? (
          <button type="button" className={btnClass("primary", "lg", true)} onClick={close}>
            <Check size={18} aria-hidden="true" /> Done
          </button>
        ) : (
          <>
            <button type="button" disabled={phase === "processing"} className={btnClass("accent", "lg", true)} onClick={() => run("success")}>
              {phase === "processing" ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : phase === "failed" ? <RotateCcw size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
              {phase === "processing" ? "Processing…" : phase === "failed" ? `Retry ${formatINR(amount)}` : `Pay ${formatINR(amount, { showPaise: true })}`}
            </button>
            <button type="button" disabled={phase === "processing"} className={cn(btnClass("ghost", "sm", true))} onClick={() => run("failure")}>
              Simulate a failed payment
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}

/** Convenience: a button that opens the sheet. */
export function UpiPayButton({ label, variant = "accent", ...sheet }: Omit<React.ComponentProps<typeof UpiSheet>, "open" | "onClose"> & { label: string; variant?: "accent" | "primary" | "soft" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={btnClass(variant, "lg", true)} onClick={() => setOpen(true)}>{label}</button>
      <UpiSheet {...sheet} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
