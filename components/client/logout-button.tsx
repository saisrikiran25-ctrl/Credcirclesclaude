"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { btnClass } from "@/components/ui";

export function LogoutButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button type="button" disabled={pending} className={btnClass("ghost", "md", true)} onClick={() => start(async () => { await logout(); router.push("/"); router.refresh(); })}>
      <LogOut size={16} aria-hidden="true" /> Log out
    </button>
  );
}
