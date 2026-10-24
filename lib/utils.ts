import { clsx, type ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Friendly, stable avatar colours (background / text), picked from the name. */
const AVATARS = [
  ["#E6E8FB", "#23307A"], ["#FFE9BF", "#7A4A00"], ["#D8F3E8", "#0A6149"], ["#FBE0E6", "#8C2A44"],
  ["#E1ECFF", "#1E4B9B"], ["#EFE3FA", "#5B2A8C"], ["#FDE9D9", "#8A3F10"], ["#DDF2F5", "#0E5B66"],
] as const;
export function avatarColors(name: string): { bg: string; fg: string } {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [bg, fg] = AVATARS[h % AVATARS.length];
  return { bg, fg };
}

export const fmtDate = (d: Date | number) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
export const fmtDay = (d: Date | number) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
export const fmtDateTime = (d: Date | number) =>
  new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function timeAgo(d: Date | number, now: number): string {
  const s = Math.max(0, Math.floor((now - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return fmtDay(d);
}

export function timeLeft(to: Date | number, now: number): string {
  const ms = new Date(to).getTime() - now;
  if (ms <= 0) return "closed";
  const h = Math.floor(ms / 3600000);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h left`;
}

/** "About N months" helper for restructure hints. */
export const addMonthsLabel = (n: number) => (Number.isFinite(n) && n >= 1 ? `Roughly ${n} monthly instalment${n === 1 ? "" : "s"} from the next due date.` : "Choose 1 to 12 months.");
