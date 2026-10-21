"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Loader2, LogOut, Repeat, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui";
import { loginAsPersona, logout } from "@/lib/actions/auth";
import { useToast } from "./toast";

const PERSONAS = [
  { key: "student", label: "Ananya", role: "Student borrower" },
  { key: "admin", label: "Vikram", role: "Circle admin / lender" },
  { key: "professional", label: "Imran", role: "Young pro / microentrepreneur" },
] as const;

export function UserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { show } = useToast();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onDown); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex min-h-11 items-center gap-1.5 rounded-full pr-2 hover:bg-surface2">
        <Avatar name={name} size={36} /> <ChevronDown size={16} className="text-muted" aria-hidden="true" />
        <span className="sr-only">Account menu for {name}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-50 w-72 rounded-3xl border border-line bg-surface p-2 shadow-xl">
          <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">Switch demo user</div>
          {PERSONAS.map((p) => (
            <button
              key={p.key}
              role="menuitem"
              type="button"
              disabled={pending}
              onClick={() => start(async () => {
                const r = await loginAsPersona(p.key);
                if (r.ok) { setOpen(false); router.push(r.redirectTo ?? "/home"); router.refresh(); } else show(r.error, "error");
              })}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left hover:bg-surface2"
            >
              {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Repeat size={16} className="text-muted" aria-hidden="true" />}
              <span><span className="block text-sm font-semibold">{p.label}</span><span className="block text-xs text-muted">{p.role}</span></span>
            </button>
          ))}
          <div className="my-1 border-t border-line" />
          <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold hover:bg-surface2"><UserRound size={16} className="text-muted" aria-hidden="true" /> Profile and settings</Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => start(async () => { const r = await logout(); if (r.ok) router.push(r.redirectTo ?? "/"); })}
            className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold hover:bg-surface2"
          >
            <LogOut size={16} className="text-muted" aria-hidden="true" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
