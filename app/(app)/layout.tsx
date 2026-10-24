import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { requireCtx } from "@/lib/session";
import { APP_NAME } from "@/lib/config";
import { unreadCount } from "@/lib/core/position";
import { SearchBox } from "@/components/client/search-box";
import { Wordmark } from "@/components/ui";
import { BottomNav, TopNav } from "@/components/client/nav";
import { UserMenu } from "@/components/client/user-menu";
import { ProtoRibbon } from "@/components/proto-ribbon";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { db, user } = await requireCtx();
  const unread = unreadCount(db, user.id);
  return (
    <div className="min-h-dvh">
      <ProtoRibbon />
      <header className="no-print sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 md:gap-6">
          <Link href="/home" aria-label={`${APP_NAME} home`} className="shrink-0"><Wordmark name={APP_NAME} size={28} /></Link>
          <TopNav />
          <div className="flex-1" />
          <SearchBox />
          <Link href="/search" aria-label="Search" className="flex size-11 items-center justify-center rounded-full hover:bg-surface2 md:hidden"><Search size={20} aria-hidden="true" /></Link>
          <Link href="/notifications" className="relative flex size-11 items-center justify-center rounded-full hover:bg-surface2 md:size-9" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
            <Bell size={20} aria-hidden="true" />
            {unread > 0 && <span className="num absolute right-0.5 top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-neg px-1 text-[10px] font-bold text-white md:right-0 md:top-0" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
          </Link>
          <UserMenu name={user.name} />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 pb-28 pt-4 md:pb-14 md:pt-6">{children}</main>
      <BottomNav />
    </div>
  );
}
