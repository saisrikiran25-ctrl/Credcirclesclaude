import Link from "next/link";
import { Bell } from "lucide-react";
import { requireCtx } from "@/lib/session";
import { userNotifications } from "@/lib/core/position";
import { EmptyState, PageHeader } from "@/components/ui";
import { MarkReadButton } from "@/components/client/mark-read";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Notifications" };

export default async function Notifications() {
  const { db, user, now } = await requireCtx();
  const list = userNotifications(db, user.id);
  const unread = list.filter((n) => !n.readAt).length;
  return (
    <div>
      <PageHeader title="Notifications" action={unread > 0 ? <MarkReadButton /> : undefined} />
      {list.length === 0 ? <EmptyState icon={<Bell size={26} />} title="All quiet" body="Votes, payments and reminders show up here." /> : (
        <ul className="divide-y divide-line rounded-3xl border border-line bg-surface">{list.map((n) => {
          const inner = (<><span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-accent"}`} aria-label={n.readAt ? undefined : "Unread"} /><div className="min-w-0 flex-1"><div className="font-semibold">{n.title}</div><p className="text-sm text-muted">{n.body}</p><div className="mt-0.5 text-xs text-muted">{timeAgo(n.createdAt, now.getTime())}</div></div></>);
          return <li key={n.id}>{n.href ? <Link href={n.href} className="flex gap-3 p-4 hover:bg-surface2">{inner}</Link> : <div className="flex gap-3 p-4">{inner}</div>}</li>;
        })}</ul>
      )}
    </div>
  );
}
