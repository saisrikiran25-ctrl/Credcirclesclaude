import Link from "next/link";
import { Bell } from "lucide-react";
import { requireCtx } from "@/lib/session";
import { APP_NAME } from "@/lib/config";
import { unreadCount } from "@/lib/core/position";
import { Wordmark } from "@/components/ui";
import { BottomNav, SideNav } from "@/components/client/nav";
import { UserMenu } from "@/components/client/user-menu";
import { ProtoRibbon } from "@/components/proto-ribbon";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { db, user } = await requireCtx();
  const unread = unreadCount(db, user.id);
  return (
    <div className="min-h-dvh">
      <ProtoRibbon />
      <header className="no-print sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/home" aria-label={`${APP_NAME} home`}><Wordmark name={APP_NAME} size={30} /></Link>
          <div className="flex items-center gap-1">
            <Link href="/notifications" className="relative flex size-11 items-center justify-center rounded-full hover:bg-surface2" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
              <Bell size={21} aria-hidden="true" />
              {unread > 0 && <span className="num absolute right-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-onaccent" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
            </Link>
            <UserMenu name={user.name} />
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-8 px-4 sm:px-6">
        <aside className="no-print sticky top-24 hidden h-fit w-56 shrink-0 py-6 md:block"><SideNav /></aside>
        <main id="main" className="min-w-0 flex-1 pb-28 pt-5 md:max-w-3xl md:pb-12 md:pt-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
