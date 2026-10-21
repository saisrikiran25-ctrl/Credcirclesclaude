"use client";

import { useEffect, useState, type ReactNode } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/domain/money";

export interface RingSegment {
  value: number;
  color: string; // CSS colour or var()
  label: string;
}

/**
 * The signature "pool" gauge: a donut that splits the circle's capital into segments
 * (lent out / available). Animated, with a text alternative for screen readers.
 */
export function RingGauge({
  segments, size = 220, thickness = 22, center, ariaLabel, className,
}: { segments: RingSegment[]; size?: number; thickness?: number; center?: ReactNode; ariaLabel: string; className?: string }) {
  const reduce = useReducedMotion();
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = (size - thickness) / 2;
  let cum = 0;
  const arcs = segments.map((s) => {
    const frac = total > 0 ? s.value / total : 0;
    const start = cum;
    cum += frac;
    return { ...s, frac, start };
  });
  const visible = arcs.filter((a) => a.frac > 0).length;
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={thickness} />
        {arcs.map((a, i) =>
          a.frac > 0 ? (
            <g key={i} transform={`rotate(${-90 + a.start * 360} ${size / 2} ${size / 2})`}>
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={thickness}
                strokeLinecap="butt"
                initial={{ pathLength: reduce ? a.frac : 0 }}
                animate={{ pathLength: Math.max(a.frac - (visible > 1 ? 0.004 : 0), 0) }}
                transition={{ duration: reduce ? 0 : 0.9, delay: reduce ? 0 : i * 0.15, ease: "easeOut" }}
              />
            </g>
          ) : null,
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ padding: thickness + 8 }}>{center}</div>
    </div>
  );
}

/** Small ring for vote threshold / repayment progress. */
export function ProgressRing({ value, size = 64, thickness = 8, color = "var(--brand)", label, children }: { value: number; size?: number; thickness?: number; color?: string; label: string; children?: ReactNode }) {
  return (
    <RingGauge
      size={size}
      thickness={thickness}
      ariaLabel={label}
      segments={[{ value: Math.min(Math.max(value, 0), 1), color, label }, { value: 1 - Math.min(Math.max(value, 0), 1), color: "transparent", label: "" }]}
      center={<span className="num text-sm font-bold">{children}</span>}
    />
  );
}

/** Members seated around a ring: the "SHG sitting in a circle". */
export function MemberRing({ members, size = 240, center }: { members: { name: string; admin?: boolean }[]; size?: number; center?: ReactNode }) {
  const shown = members.slice(0, 12);
  const extra = members.length - shown.length;
  const avatar = Math.max(34, Math.min(46, size / 6));
  const r = size / 2 - avatar / 2 - 2;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }} role="img" aria-label={`${members.length} members: ${members.map((m) => m.name).join(", ")}`}>
      <svg className="absolute inset-0" width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="2" strokeDasharray="3 7" />
      </svg>
      {shown.map((m, i) => {
        const a = (Math.PI * 2 * i) / shown.length - Math.PI / 2;
        const x = size / 2 + r * Math.cos(a) - avatar / 2;
        const y = size / 2 + r * Math.sin(a) - avatar / 2;
        return (
          <motion.span
            key={m.name + i}
            className={cn("absolute rounded-full ring-2 ring-surface", m.admin && "outline outline-2 outline-offset-1 outline-accent")}
            style={{ left: x, top: y, width: avatar, height: avatar }}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05 * i, type: "spring", stiffness: 260, damping: 20 }}
            title={m.name + (m.admin ? " (admin)" : "")}
          >
            <Avatar name={m.name} size={avatar} />
          </motion.span>
        );
      })}
      {extra > 0 && <span className="absolute bottom-0 right-0 rounded-full bg-surface2 px-2 py-0.5 text-xs font-semibold">+{extra}</span>}
      <div className="absolute inset-0 flex items-center justify-center text-center" style={{ padding: avatar + 14 }}>{center}</div>
    </div>
  );
}

/** Counts up to a value on first paint (instant under prefers-reduced-motion). */
export function CountUp({ value, format = "inr", className }: { value: number; format?: "inr" | "int"; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (reduce) { setShown(value); return; }
    const controls = animate(value * 0.7, value, { duration: 0.8, ease: "easeOut", onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [value, reduce]);
  return <span className={cn("num", className)}>{format === "inr" ? formatINR(shown) : shown.toLocaleString("en-IN")}</span>;
}
