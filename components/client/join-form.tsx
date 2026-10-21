"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { joinAction } from "@/lib/actions/circles";
import { btnClass } from "@/components/ui";
import { TextInput } from "./form-bits";
import { useToast } from "./toast";

export function JoinCodeForm() {
  const [code, setCode] = useState("");
  const router = useRouter();
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); router.push(`/join/${code.trim().toUpperCase()}`); }}>
      <TextInput label="Invite code" placeholder="e.g. K7PX2M" maxLength={8} autoCapitalize="characters" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
      <button type="submit" disabled={code.trim().length < 4} className={btnClass("primary", "lg", true)}>Find circle</button>
    </form>
  );
}

export function JoinButton({ code }: { code: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  const { show } = useToast();
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        className={btnClass("accent", "lg", true)}
        onClick={() => start(async () => {
          const r = await joinAction(code);
          if (r.ok && r.redirectTo) { show(r.message ?? "Joined"); router.push(r.redirectTo); }
          else if (!r.ok) setError(r.error);
        })}
      >
        {pending && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} Join this circle
      </button>
      {error && <p role="alert" className="text-sm font-medium text-neg">{error}</p>}
    </div>
  );
}
