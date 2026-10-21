/** Indian digit grouping: 1234567 -> "12,34,567". Works on integer rupees. */
function groupIndian(n: number): string {
  const s = Math.abs(Math.trunc(n)).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

/** Paise -> "₹1,25,000" (or "₹1,250.50" when showPaise and not whole). */
export function formatINR(paise: number, opts: { showPaise?: boolean } = {}): string {
  const neg = paise < 0;
  const abs = Math.abs(paise);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  let out = `₹${groupIndian(whole)}`;
  if (opts.showPaise && frac !== 0) out += `.${frac.toString().padStart(2, "0")}`;
  return neg ? `-${out}` : out;
}

/** Compact lakh/crore summary: 5000000 paise*... e.g. ₹7.5 lakh, ₹2 cr. */
export function formatINRCompact(paise: number): string {
  const r = Math.abs(paise) / 100;
  const sign = paise < 0 ? "-" : "";
  const trim = (x: number) => x.toFixed(2).replace(/\.?0+$/, "");
  if (r >= 1_00_00_000) return `${sign}₹${trim(r / 1_00_00_000)} cr`;
  if (r >= 1_00_000) return `${sign}₹${trim(r / 1_00_000)} lakh`;
  return `${sign}₹${groupIndian(r)}`;
}

export function formatPct(n: number, digits = 1): string {
  return `${Number(n.toFixed(digits))}%`;
}

/** Split `total` into `parts` integers that sum exactly to total (remainder spread over the first parts). */
export function splitEvenly(total: number, parts: number): number[] {
  if (!Number.isInteger(total) || !Number.isInteger(parts) || parts <= 0) {
    throw new Error("splitEvenly needs integer total and parts > 0");
  }
  const base = Math.floor(total / parts);
  const rem = total - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < rem ? 1 : 0));
}

/** Split `total` proportionally to integer `weights`; sums exactly to total (largest-remainder). */
export function splitProportionally(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const floors = raw.map(Math.floor);
  let left = total - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return floors;
}
