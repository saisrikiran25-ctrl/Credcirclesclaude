import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Info, TriangleAlert, CircleCheck, ShieldAlert } from "lucide-react";
import { avatarColors, cn, initials } from "@/lib/utils";
import { formatINR } from "@/lib/domain/money";

/* ---------- surfaces ---------- */

export function Card({ className, children, as: As = "div", ...rest }: { className?: string; children: ReactNode; as?: "div" | "section" | "article" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cn("rounded-2xl border border-line bg-surface p-4 md:p-5", className)} {...rest}>
      {children}
    </As>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 mt-7 flex items-center justify-between gap-3 first:mt-0">
      <h2 className="text-base font-semibold tracking-tight md:text-[15px]">{children}</h2>
      {action}
    </div>
  );
}

/** Small "see all" style text link used in section headers. */
export function SeeAll({ href, children = "See all" }: { href: string; children?: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-0.5 text-sm font-semibold text-brand hover:underline md:min-h-8">
      {children} <ChevronRight size={16} aria-hidden="true" />
    </Link>
  );
}

/* ---------- badges, avatars, progress ---------- */

type Tone = "neutral" | "brand" | "pos" | "warn" | "neg" | "accent";
const TONES: Record<Tone, string> = {
  neutral: "bg-surface2 text-muted",
  brand: "bg-brandsoft text-brand",
  pos: "bg-possoft text-pos",
  warn: "bg-warnsoft text-warn",
  neg: "bg-negsoft text-neg",
  accent: "bg-accentsoft text-accent",
};

/** Colour never carries meaning alone: every badge has text (and optionally an icon). */
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold leading-none", TONES[tone], className)}>{children}</span>;
}

export function Avatar({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  const { bg, fg } = avatarColors(name);
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", className)}
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

export function ProgressBar({ value, label, tone = "brand", marker }: { value: number; label: string; tone?: "brand" | "pos" | "warn" | "neg"; marker?: number }) {
  const pct = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  const fill = { brand: "bg-brand", pos: "bg-pos", warn: "bg-warn", neg: "bg-neg" }[tone];
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="relative h-2 w-full overflow-hidden rounded-full bg-surface2">
      <div className={cn("h-full rounded-full transition-[width] duration-700", fill)} style={{ width: `${pct}%` }} />
      {marker !== undefined && <div className="absolute inset-y-0 w-0.5 bg-fg/50" style={{ left: `${Math.min(marker * 100, 100)}%` }} />}
    </div>
  );
}

/* ---------- numbers: gain/loss, stats, key-value ---------- */

/** Gain/loss chip: arrow + amount (+ percent). The arrow and sign make it readable without colour. */
export function Delta({ paise, pct, className, zeroLabel }: { paise?: number; pct?: number | null; className?: string; zeroLabel?: string }) {
  const v = paise ?? pct ?? 0;
  if (v === 0 && zeroLabel) return <span className={cn("text-sm text-muted", className)}>{zeroLabel}</span>;
  const up = v >= 0;
  return (
    <span className={cn("num inline-flex items-center gap-1 text-sm font-semibold", up ? "text-pos" : "text-neg", className)}>
      <span aria-hidden="true" className="text-[9px] leading-none">{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "Up " : "Down "}</span>
      {paise !== undefined && formatINR(Math.abs(paise), { showPaise: true })}
      {pct !== undefined && pct !== null && <span className={paise !== undefined ? "font-medium" : ""}>{paise !== undefined ? ` (${Math.abs(pct).toFixed(1)}%)` : `${Math.abs(pct).toFixed(1)}%`}</span>}
    </span>
  );
}

export function StatTile({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "pos" | "neg" | "warn" }) {
  const color = tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : tone === "warn" ? "text-warn" : "text-fg";
  return (
    <div className="rounded-xl border border-line bg-surface p-3.5">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={cn("num mt-1 text-lg font-semibold tracking-tight md:text-[17px]", color)}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

/** Zerodha-style statement rows: label left, figure right, hairlines between. */
export function KeyValue({ rows, className }: { rows: { k: ReactNode; v: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-line", className)}>
      {rows.map((r, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
          <dt className="text-muted">{r.k}</dt>
          <dd className="num text-right font-medium">{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Tiny trend line for list rows. Pure SVG, no client JS. */
export function Sparkline({ values, width = 64, height = 24, up }: { values: number[]; width?: number; height?: number; up?: boolean }) {
  if (values.length < 2) return <span style={{ width }} className="inline-block" aria-hidden="true" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * (width - 2) + 1).toFixed(1)},${(height - 2 - ((v - min) / span) * (height - 4)).toFixed(1)}`).join(" ");
  const rising = up ?? values[values.length - 1] >= values[0];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="shrink-0">
      <polyline points={pts} fill="none" stroke={rising ? "var(--green)" : "var(--red)"} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- tabs (underline, like a stock page) ---------- */

export function Tabs({ items, label }: { items: { href: string; label: string; active: boolean }[]; label: string }) {
  return (
    <nav aria-label={label} className="hide-scrollbar -mx-4 mb-4 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0">
      <ul className="flex gap-6">
        {items.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={cn("inline-flex min-h-11 items-center whitespace-nowrap border-b-2 text-sm font-semibold transition", t.active ? "border-brand text-brand" : "border-transparent text-muted hover:text-fg")}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Pill-shaped filter chips (Groww "All / Stocks / Funds" row). */
export function ChipLinks({ items, label }: { items: { href: string; label: string; active: boolean }[]; label: string }) {
  return (
    <nav aria-label={label} className="hide-scrollbar -mx-4 mb-3 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex gap-2">
        {items.map((c) => (
          <li key={c.href}>
            <Link href={c.href} aria-current={c.active ? "page" : undefined}
              className={cn("inline-flex min-h-10 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition", c.active ? "border-brand bg-brandsoft text-brand" : "border-line bg-surface text-fg hover:bg-surface2")}>
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ---------- headers, empty and notice states ---------- */

export function PageHeader({ title, subtitle, back, action }: { title: ReactNode; subtitle?: ReactNode; back?: string; action?: ReactNode }) {
  return (
    <header className="mb-4 md:mb-5">
      {back && (
        <Link href={back} className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-0.5 rounded-lg px-2 text-sm font-medium text-muted hover:text-fg md:min-h-9">
          <ChevronLeft size={18} aria-hidden="true" /> Back
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-brandsoft text-brand" aria-hidden="true">{icon}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const NOTICE = {
  info: { cls: "bg-accentsoft", icon: Info, color: "text-accent" },
  warn: { cls: "bg-warnsoft", icon: TriangleAlert, color: "text-warn" },
  neg: { cls: "bg-negsoft", icon: ShieldAlert, color: "text-neg" },
  pos: { cls: "bg-possoft", icon: CircleCheck, color: "text-pos" },
} as const;

export function Notice({ tone = "info", title, children, className }: { tone?: keyof typeof NOTICE; title?: string; children?: ReactNode; className?: string }) {
  const N = NOTICE[tone];
  const Icon = N.icon;
  return (
    <div role={tone === "neg" || tone === "warn" ? "alert" : "note"} className={cn("flex gap-3 rounded-xl p-3.5 text-sm", N.cls, className)}>
      <Icon size={18} className={cn("mt-0.5 shrink-0", N.color)} aria-hidden="true" />
      <div className="min-w-0">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={cn(title && "mt-0.5", "text-muted [&_strong]:text-fg")}>{children}</div>}
      </div>
    </div>
  );
}

/* ---------- buttons ---------- */

const BTN = {
  primary: "grad-brand text-white shadow-[0_6px_16px_-6px_var(--glow)] hover:brightness-110",
  accent: "bg-accent text-onaccent hover:brightness-95",
  soft: "bg-brandsoft text-brand hover:brightness-95",
  ghost: "border border-line bg-surface text-fg hover:bg-surface2",
  danger: "bg-neg text-white hover:brightness-95",
} as const;
export type BtnVariant = keyof typeof BTN;
export const btnClass = (variant: BtnVariant = "primary", size: "md" | "lg" | "sm" = "md", full = false) =>
  cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
    size === "lg" ? "min-h-12 px-6 text-base md:min-h-11 md:text-[15px]" : size === "sm" ? "min-h-11 px-4 text-sm md:min-h-9" : "min-h-12 px-5 text-[15px] md:min-h-10 md:text-sm",
    BTN[variant],
    full && "w-full",
  );

export function LinkButton({ href, children, variant = "primary", size = "md", full, className }: { href: string; children: ReactNode; variant?: BtnVariant; size?: "md" | "lg" | "sm"; full?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn(btnClass(variant, size, full), className)}>
      {children}
    </Link>
  );
}

/* ---------- brand ---------- */

export function LogoMark({ size = 32 }: { size?: number }) {
  const dots = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    return { x: 50 + 28 * Math.cos(a), y: 50 + 28 * Math.sin(a) };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Circlo logo">
      <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#00b386" /><stop offset="1" stopColor="#7c5cff" /></linearGradient></defs>
      <rect width="100" height="100" rx="28" fill="url(#lg)" />
      <circle cx="50" cy="50" r="28" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" />
      {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={i === 0 ? 8 : 6} fill="#fff" />)}
      <circle cx="50" cy="50" r="10" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className="font-display text-xl font-bold tracking-tight">{name}</span>
    </span>
  );
}

export function RiskBadge({ band, score }: { band: "low" | "medium" | "high" | null; score: number | null }) {
  if (band === null || score === null) return <Badge tone="neutral">Not enough history</Badge>;
  const tone = band === "low" ? "pos" : band === "medium" ? "warn" : "neg";
  const label = band === "low" ? "Low risk" : band === "medium" ? "Medium risk" : "High risk";
  return (
    <Badge tone={tone}>
      <span className="num">{score}</span>/100 · {label}
    </Badge>
  );
}
