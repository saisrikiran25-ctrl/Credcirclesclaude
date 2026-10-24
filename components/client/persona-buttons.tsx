"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Landmark, Store, Loader2 } from "lucide-react";
import { loginAsPersona } from "@/lib/actions/auth";
import { useToast } from "./toast";

const PERSONAS = [
  { key: "student", icon: GraduationCap, title: "Student borrower", name: "Ananya", body: "Has a loan due in 2 days and a vote waiting." },
  { key: "admin", icon: Landmark, title: "Circle admin / lender", name: "Vikram", body: "Runs a circle and owes a UPI payment to a borrower." },
  { key: "professional", icon: Store, title: "Young pro / microentrepreneur", name: "Imran", body: "Outside borrower on AutoPay in another circle." },
] as const;

export function PersonaButtons({ compact }: { compact?: boolean }) {
  const [pending, start] = useTransition();
  const [which, setWhich] = useState<string | null>(null);
  const router = useRouter();
  const { show } = useToast();
  return (
    <div className={compact ? "grid gap-2" : "grid gap-3 sm:grid-cols-3"}>
      {PERSONAS.map(({ key, icon: Icon, title, name, body }) => (
        <button
          key={key}
          type="button"
          disabled={pending}
          onClick={() => {
            setWhich(key);
            start(async () => {
              const r = await loginAsPersona(key);
              if (r.ok && r.redirectTo) router.push(r.redirectTo);
              else if (!r.ok) show(r.error, "error");
            });
          }}
          className="flex min-h-16 items-center gap-3 rounded-xl border border-line bg-surface p-3.5 text-left transition hover:border-brand hover:bg-brandsoft active:scale-[0.99] disabled:opacity-60"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brandsoft text-brand">
            {pending && which === key ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Icon size={20} aria-hidden="true" />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{title} <span className="font-normal text-muted">· {name}</span></span>
            <span className="block text-xs text-muted">{body}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
