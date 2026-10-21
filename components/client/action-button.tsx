"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { btnClass, type BtnVariant } from "@/components/ui";
import { useToast } from "./toast";
import type { ActionResult } from "@/lib/actions/helpers";
import { cn } from "@/lib/utils";

/** Runs a server action with a pending state and a toast. Optional native confirm for destructive steps. */
export function ActionButton({
  action, children, variant = "primary", size = "md", full, confirm, className, disabled, onDone,
}: {
  action: () => Promise<ActionResult>;
  children: ReactNode;
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
  full?: boolean;
  confirm?: string;
  className?: string;
  disabled?: boolean;
  onDone?: (r: ActionResult) => void;
}) {
  const [pending, start] = useTransition();
  const { show } = useToast();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending || disabled}
      aria-busy={pending}
      className={cn(btnClass(variant, size, full), className)}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const r = await action();
          if (r.ok) {
            if (r.message) show(r.message);
            if (r.redirectTo) router.push(r.redirectTo);
          } else show(r.error, "error");
          onDone?.(r);
        });
      }}
    >
      {pending && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
