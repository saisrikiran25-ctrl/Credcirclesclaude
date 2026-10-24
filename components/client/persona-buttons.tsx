"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { loginAsPersona } from "@/lib/actions/auth";
import { useToast } from "./toast";

const PERSONAS = [
  { key: "student", emoji: "🎓", tint: "from-[#00b386] to-[#0a8f7a]", title: "Student borrower", name: "Ananya", body: "Has a loan due in 2 days and a vote waiting." },
  { key: "admin", emoji: "🏦", tint: "from-[#7c5cff] to-[#4a5af0]", title: "Circle admin / lender", name: "Vikram", body: "Runs a circle and owes a UPI payment to a borrower." },
  { key: "professional", emoji: "🛍️", tint: "from-[#ff5fa2] to-[#ff8a4c]", title: "Young pro", name: "Imran", body: "Outside borrower on AutoPay in another circle. Small business vibes." },
] as const;

export function PersonaButtons(_props: { compact?: boolean }) {
  const [pending, start] = useTransition();
  const [which, setWhich] = useState<string | null>(null);
  const router = useRouter();
  const { show } = useToast();
  return (
    <div className="grid gap-2.5">
      {PERSONAS.map(({ key, emoji, tint, title, name, body }) => (
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
          className="lift group flex min-h-[4.5rem] w-full items-center gap-3.5 rounded-2xl border border-line bg-surface p-3 pr-4 text-left hover:border-brand disabled:opacity-60"
        >
          <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tint} text-2xl shadow-sm`} aria-hidden="true">
            {pending && which === key ? <Loader2 size={20} className="animate-spin text-white" /> : emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[15px] font-semibold">{name} <span className="font-sans text-xs font-medium text-muted">· {title}</span></span>
            <span className="block text-xs text-muted">{body}</span>
          </span>
          <ArrowRight size={18} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
