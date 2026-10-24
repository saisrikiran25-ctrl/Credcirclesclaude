"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Clock, CornerDownLeft, FileText, HandCoins, Loader2, Search, X } from "lucide-react";
import { Avatar, CircleIcon } from "@/components/ui";

type Hit = { kind: "circle" | "loan" | "person" | "page"; id: string; href: string; title: string; sub: string };
const LABEL: Record<Hit["kind"], string> = { circle: "Circles", loan: "Loans", person: "People", page: "Pages" };
const RECENT_KEY = "circlo.recent-searches";

function readRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]").slice(0, 5); } catch { return []; }
}
function saveRecent(q: string) {
  try {
    const next = [q, ...readRecent().filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* storage unavailable: recent searches are a convenience only */ }
}

/** Bold the parts of `text` that match the typed words. */
function Highlight({ text, q }: { text: string; q: string }) {
  const words = q.toLowerCase().replace(/[₹,]/g, "").split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return <>{text}</>;
  const lower = text.toLowerCase();
  const mark = new Array(text.length).fill(false);
  for (const w of words) { let i = lower.indexOf(w); while (i !== -1) { for (let k = i; k < i + w.length; k++) mark[k] = true; i = lower.indexOf(w, i + w.length); } }
  const parts: { s: string; m: boolean }[] = [];
  for (let i = 0; i < text.length; i++) { const last = parts[parts.length - 1]; if (last && last.m === mark[i]) last.s += text[i]; else parts.push({ s: text[i], m: mark[i] }); }
  return <>{parts.map((p, i) => (p.m ? <mark key={i} className="rounded-sm bg-brandsoft px-0.5 text-brand">{p.s}</mark> : <span key={i}>{p.s}</span>))}</>;
}

function HitIcon({ hit }: { hit: Hit }) {
  if (hit.kind === "circle") return <CircleIcon name={hit.title} size={34} />;
  if (hit.kind === "person") return <Avatar name={hit.title.replace(" (you)", "")} size={34} />;
  const Icon = hit.kind === "loan" ? HandCoins : FileText;
  return <span aria-hidden="true" className="flex size-[34px] shrink-0 items-center justify-center rounded-xl bg-accentsoft text-accent"><Icon size={17} /></span>;
}

export function SearchBox({ variant = "nav", initial = "" }: { variant?: "nav" | "page"; initial?: string }) {
  const router = useRouter();
  const uid = useId();
  const listId = `${uid}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const trimmed = q.trim();

  // Debounced fetch with cancellation, so a slow response never overwrites a newer one.
  useEffect(() => {
    if (!open) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/search/suggest?q=${encodeURIComponent(trimmed)}`, { signal: ctl.signal });
        if (r.ok) { setHits((await r.json()).hits as Hit[]); setActive(-1); }
      } catch { /* aborted or offline: keep the previous list */ }
      if (!ctl.signal.aborted) setLoading(false);
    }, trimmed ? 110 : 0);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [trimmed, open]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // "/" focuses search anywhere (like Kite and GitHub), unless the user is typing in a field.
  useEffect(() => {
    if (variant !== "nav") return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(el.tagName) && !el.isContentEditable) { e.preventDefault(); inputRef.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [variant]);

  const go = useCallback((href: string, remember?: string) => {
    if (remember) saveRecent(remember);
    setOpen(false);
    inputRef.current?.blur();
    router.push(href);
  }, [router]);

  const rows: { key: string; href: string; hit?: Hit; recent?: string }[] = trimmed
    ? [...hits.map((h) => ({ key: `${h.kind}-${h.id}`, href: h.href, hit: h })), { key: "all", href: `/search?q=${encodeURIComponent(trimmed)}` }]
    : [...recent.map((r) => ({ key: `r-${r}`, href: `/search?q=${encodeURIComponent(r)}`, recent: r })), ...hits.map((h) => ({ key: `${h.kind}-${h.id}`, href: h.href, hit: h }))];

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % Math.max(rows.length, 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? rows.length - 1 : a - 1)); }
    else if (e.key === "Escape") { if (open) { e.preventDefault(); setOpen(false); } }
    else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[active];
      if (row) go(row.href, row.hit ? trimmed || undefined : row.recent);
      else if (trimmed) go(`/search?q=${encodeURIComponent(trimmed)}`, trimmed);
    }
  };

  let lastKind = "";
  const big = variant === "page";
  return (
    <div ref={wrapRef} className={`relative ${big ? "w-full" : "hidden w-72 md:block lg:w-80"}`}>
      <Search size={big ? 18 : 16} className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted ${big ? "left-3.5" : "left-3"}`} aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        name="q"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${uid}-opt-${active}` : undefined}
        aria-label="Search circles, loans, people and pages"
        placeholder={big ? "Search circles, loans, people" : "Search circles, loans, people"}
        autoComplete="off"
        value={q}
        autoFocus={big}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => { setRecent(readRecent()); setOpen(true); }}
        onKeyDown={onKeyDown}
        className={`w-full border border-transparent bg-surface2 pl-9 pr-16 placeholder:text-muted focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 ${big ? "min-h-12 rounded-xl bg-surface !border-line pl-10 md:min-h-11" : "h-9 rounded-lg text-sm"}`}
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {loading && <Loader2 size={15} className="animate-spin text-muted" aria-hidden="true" />}
        {q && <button type="button" aria-label="Clear search" onClick={() => { setQ(""); inputRef.current?.focus(); }} className="flex size-6 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-fg"><X size={14} aria-hidden="true" /></button>}
        {!q && !big && <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold text-muted lg:block" aria-hidden="true">/</kbd>}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_44px_-16px_rgba(20,24,40,0.35)] md:min-w-[22rem]">
          <ul id={listId} role="listbox" aria-label="Search suggestions" className="max-h-[min(70vh,26rem)] overflow-y-auto py-1.5">
            {rows.length === 0 && !loading && <li role="presentation" className="px-4 py-6 text-center text-sm text-muted">No matches. Try a circle name, a person, or an amount like 5000.</li>}
            {rows.map((r, i) => {
              const heading = r.recent ? "Recent" : r.hit ? (trimmed ? LABEL[r.hit.kind] : "Quick links") : "";
              const showHeading = heading && heading !== lastKind;
              if (heading) lastKind = heading;
              return (
                <li key={r.key} role="presentation">
                  {showHeading && <div className="px-4 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{heading}</div>}
                  <a
                    id={`${uid}-opt-${i}`}
                    role="option"
                    aria-selected={active === i}
                    href={r.href}
                    onMouseEnter={() => setActive(i)}
                    onClick={(e) => { e.preventDefault(); go(r.href, r.hit ? trimmed || undefined : r.recent); }}
                    className={`flex min-h-12 items-center gap-3 px-4 py-1.5 text-sm ${active === i ? "bg-surface2" : ""}`}
                  >
                    {r.hit ? (
                      <>
                        <HitIcon hit={r.hit} />
                        <span className="min-w-0 flex-1"><span className="block truncate font-medium"><Highlight text={r.hit.title} q={trimmed} /></span><span className="block truncate text-xs text-muted"><Highlight text={r.hit.sub} q={trimmed} /></span></span>
                        {active === i && <CornerDownLeft size={14} className="shrink-0 text-muted" aria-hidden="true" />}
                      </>
                    ) : r.recent ? (
                      <><span className="flex size-[34px] shrink-0 items-center justify-center rounded-xl bg-surface2 text-muted"><Clock size={16} aria-hidden="true" /></span><span className="flex-1 truncate">{r.recent}</span></>
                    ) : (
                      <><span className="flex size-[34px] shrink-0 items-center justify-center rounded-xl bg-brandsoft text-brand"><Search size={16} aria-hidden="true" /></span><span className="flex-1 font-medium">See all results for “{trimmed}”</span><ArrowUpRight size={15} className="text-muted" aria-hidden="true" /></>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
