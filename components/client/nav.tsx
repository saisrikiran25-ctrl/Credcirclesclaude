"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleDot, HandCoins, House, ScrollText, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/home", label: "Home", icon: House },
  { href: "/circles", label: "Circles", icon: CircleDot },
  { href: "/loans", label: "Loans", icon: HandCoins },
  { href: "/ledger", label: "Ledger", icon: ScrollText },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

const active = (path: string, href: string) => path === href || path.startsWith(href + "/");

/** Phone: five-tab bar pinned to the bottom, like a trading app. */
export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch">
        {NAV.map((n) => {
          const on = active(path, n.href);
          const Icon = n.icon;
          return (
            <li key={n.href} className="flex-1">
              <Link href={n.href} aria-current={on ? "page" : undefined} className={cn("relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", on ? "text-brand" : "text-muted")}>
                {on && <span className="absolute inset-x-6 top-0 h-0.5 rounded-b bg-brand" aria-hidden="true" />}
                <Icon size={22} strokeWidth={on ? 2.4 : 1.8} aria-hidden="true" />
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const DESKTOP = [...NAV.slice(0, 4), { href: "/position", label: "Position", icon: UserRound }] as const;

/** Desktop: text links in the header with an underline on the current page (Kite style). */
export function TopNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="no-print hidden items-stretch gap-1 md:flex">
      {DESKTOP.map((n) => {
        const on = active(path, n.href);
        return (
          <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}
            className={cn("relative flex items-center px-3 text-sm font-medium transition", on ? "text-brand" : "text-muted hover:text-fg")}>
            {n.label}
            {on && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-t bg-brand" aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}
