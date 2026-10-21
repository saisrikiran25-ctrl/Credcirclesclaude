"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleDot, HandCoins, House, ScrollText, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/home", label: "Home", icon: House },
  { href: "/circles", label: "Circles", icon: CircleDot },
  { href: "/loans", label: "Lend / Borrow", short: "Loans", icon: HandCoins },
  { href: "/ledger", label: "Ledger", icon: ScrollText },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

const active = (path: string, href: string) => path === href || path.startsWith(href + "/");

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {NAV.map((n) => {
          const on = active(path, n.href);
          const Icon = n.icon;
          return (
            <li key={n.href} className="flex-1">
              <Link href={n.href} aria-current={on ? "page" : undefined} className={cn("flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold", on ? "text-brand" : "text-muted")}>
                <span className={cn("flex h-8 w-14 items-center justify-center rounded-full transition", on && "bg-brandsoft")}>
                  <Icon size={21} aria-hidden="true" />
                </span>
                {"short" in n ? n.short : n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="no-print flex flex-col gap-1">
      {NAV.map((n) => {
        const on = active(path, n.href);
        const Icon = n.icon;
        return (
          <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined} className={cn("flex min-h-12 items-center gap-3 rounded-2xl px-4 text-[15px] font-semibold transition", on ? "bg-brandsoft text-brand" : "text-muted hover:bg-surface2 hover:text-fg")}>
            <Icon size={20} aria-hidden="true" /> {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
