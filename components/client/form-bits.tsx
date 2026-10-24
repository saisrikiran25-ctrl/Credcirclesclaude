"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-fg">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p role="alert" className="text-xs font-medium text-neg">{error}</p>}
    </div>
  );
}

const control = "min-h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-fg placeholder:text-muted/70 transition focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:opacity-60 md:min-h-10";

export function TextInput({ label, hint, error, className, ...rest }: { label: string; hint?: ReactNode; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <input id={id} aria-invalid={!!error} aria-describedby={undefined} className={cn(control, error && "border-neg", className)} {...rest} />
    </Field>
  );
}

export function SelectInput({ label, hint, error, children, className, ...rest }: { label: string; hint?: ReactNode; error?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <select id={id} className={cn(control, "appearance-none bg-[length:16px] pr-10", className)} {...rest}>{children}</select>
    </Field>
  );
}

/** Rupee amount input. Holds RUPEES as text; callers convert to paise. */
export function RupeeInput({ label, value, onChange, hint, error, min, max, step = 100 }: { label: string; value: string; onChange: (v: string) => void; hint?: ReactNode; error?: string; min?: number; max?: number; step?: number }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-medium text-muted" aria-hidden="true">₹</span>
        <input id={id} inputMode="numeric" type="number" min={min} max={max} step={step} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} className={cn(control, "num pl-8", error && "border-neg")} />
      </div>
    </Field>
  );
}

export function Chips<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className={cn("min-h-11 rounded-full border px-4 text-sm font-medium transition md:min-h-9", value === o.id ? "border-brand bg-brandsoft text-brand" : "border-line bg-surface hover:bg-surface2")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
