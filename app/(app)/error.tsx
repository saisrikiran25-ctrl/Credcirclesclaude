"use client";

import { useEffect } from "react";
import { btnClass } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div role="alert" className="mx-auto max-w-md rounded-3xl border border-line bg-surface p-8 text-center">
      <h1 className="font-display text-xl font-semibold">That did not load</h1>
      <p className="mt-1 text-sm text-muted">Something went wrong on our side. Your data is safe. Try again.</p>
      <button type="button" onClick={reset} className={`${btnClass("primary")} mt-5`}>Try again</button>
    </div>
  );
}
