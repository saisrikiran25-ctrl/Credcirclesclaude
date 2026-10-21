import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, Info, TriangleAlert, CircleCheck, ShieldAlert } from "lucide-react";
import { avatarColors, cn, initials } from "@/lib/utils";

/* ---------- surfaces ---------- */

export function Card({ className, children, as: As = "div", ...rest }: { className?: string; children: ReactNode; as?: "div" | "section" | "article" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cn("rounded-3xl border border-line bg-surface p-5", className)} {...rest}>
      {children}
    </As>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-end justify-between gap-3 first:mt-0">
      <h2 className="font-display text-lg font-semibold">{children}</h2>
      {action}
    </div>
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
  accent: "bg-accent text-onaccent",
};

/** Colour never carries meaning alone: every badge has text (and optionally an icon). */
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none", TONES[tone], className)}>{children}</span>;
}

export function Avatar({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  const { bg, fg } = avatarColors(name);
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold", className)}
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
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="relative h-3 w-full overflow-hidden rounded-full bg-surface2">
      <div className={cn("h-full rounded-full transition-[width] duration-700", fill)} style={{ width: `${pct}%` }} />
      {marker !== undefined && <div className="absolute inset-y-0 w-0.5 bg-fg/60" style={{ left: `${Math.min(marker * 100, 100)}%` }} />}
    </div>
  );
}

/* ---------- stats and headers ---------- */

export function StatTile({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "pos" | "neg" | "warn" }) {
  const color = tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : tone === "warn" ? "text-warn" : "text-fg";
  return (
    <div className="rounded-2xl bg-surface2 p-4">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={cn("num mt-1 font-display text-xl font-semibold", color)}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, back, action }: { title: ReactNode; subtitle?: ReactNode; back?: string; action?: ReactNode }) {
  return (
    <header className="mb-5">
      {back && (
        <Link href={back} className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-fg">
          <ChevronLeft size={18} aria-hidden="true" /> Back
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-10 text-center">
      <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-brandsoft text-brand" aria-hidden="true">{icon}</div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const NOTICE = {
  info: { cls: "bg-brandsoft text-fg", icon: Info, color: "text-brand" },
  warn: { cls: "bg-warnsoft text-fg", icon: TriangleAlert, color: "text-warn" },
  neg: { cls: "bg-negsoft text-fg", icon: ShieldAlert, color: "text-neg" },
  pos: { cls: "bg-possoft text-fg", icon: CircleCheck, color: "text-pos" },
} as const;

export function Notice({ tone = "info", title, children, className }: { tone?: keyof typeof NOTICE; title?: string; children?: ReactNode; className?: string }) {
  const N = NOTICE[tone];
  const Icon = N.icon;
  return (
    <div role={tone === "neg" || tone === "warn" ? "alert" : "note"} className={cn("flex gap-3 rounded-2xl p-4 text-sm", N.cls, className)}>
      <Icon size={20} className={cn("mt-0.5 shrink-0", N.color)} aria-hidden="true" />
      <div className="min-w-0">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={cn(title && "mt-0.5", "text-muted [&_strong]:text-fg")}>{children}</div>}
      </div>
    </div>
  );
}

/* ---------- buttons ---------- */

const BTN = {
  primary: "bg-brand text-onbrand hover:opacity-90",
  accent: "bg-accent text-onaccent hover:brightness-95",
  soft: "bg-brandsoft text-brand hover:brightness-95",
  ghost: "border border-line bg-surface text-fg hover:bg-surface2",
  danger: "bg-neg text-white hover:opacity-90",
} as const;
export type BtnVariant = keyof typeof BTN;
export const btnClass = (variant: BtnVariant = "primary", size: "md" | "lg" | "sm" = "md", full = false) =>
  cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
    size === "lg" ? "min-h-14 px-7 text-base" : size === "sm" ? "min-h-11 px-4 text-sm" : "min-h-12 px-5 text-[15px]",
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
    return { x: 50 + 27 * Math.cos(a), y: 50 + 27 * Math.sin(a), accent: i === 0 };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Circlo logo">
      <rect width="100" height="100" rx="24" fill="var(--brand)" />
      <circle cx="50" cy="50" r="27" fill="none" stroke="var(--onbrand)" strokeOpacity="0.3" strokeWidth="2.6" />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.accent ? 7.5 : 6} fill={d.accent ? "var(--accent)" : "var(--onbrand)"} />
      ))}
      <circle cx="50" cy="50" r="11" fill="var(--accent)" />
      <circle cx="50" cy="50" r="5.5" fill="none" stroke="var(--brand)" strokeWidth="2" />
    </svg>
  );
}

export function Wordmark({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
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
