import Link from "next/link";
import { Notice } from "@/components/ui";

const TABS = [["/admin", "Pilot metrics"], ["/admin/revenue", "Revenue"], ["/admin/projections", "Projections"]] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Notice className="mb-4" title="Platform view (demo)">Open to every signed-in demo user so you can see it. In production this is restricted to platform staff.</Notice>
      <nav aria-label="Admin sections" className="-mx-4 mb-5 overflow-x-auto px-4"><ul className="flex gap-2">{TABS.map(([h, l]) => <li key={h}><Link href={h} className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-surface2 px-4 text-sm font-semibold hover:bg-brandsoft">{l}</Link></li>)}</ul></nav>
      {children}
    </div>
  );
}
