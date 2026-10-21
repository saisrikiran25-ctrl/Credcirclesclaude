"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { submitNpsAction } from "@/lib/actions/loans";
import { useToast } from "./toast";
import { cn } from "@/lib/utils";

export function NpsWidget() {
  const [score, setScore] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const { show } = useToast();
  if (done) return <p className="flex items-center gap-2 text-sm font-semibold text-pos"><Check size={18} aria-hidden="true" /> Thanks, that helps us improve.</p>;
  return (
    <div>
      <p className="mb-3 text-sm">How likely are you to recommend Circlo to a friend? (0 = not at all, 10 = definitely)</p>
      <div role="radiogroup" aria-label="Likelihood to recommend, 0 to 10" className="flex flex-wrap gap-1.5">
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} type="button" role="radio" aria-checked={score === i} onClick={async () => {
            setScore(i);
            const r = await submitNpsAction(i);
            if (r.ok) setDone(true); else show(r.error, "error");
          }} className={cn("num flex size-11 items-center justify-center rounded-full border text-sm font-semibold", score === i ? "border-brand bg-brand text-onbrand" : "border-line bg-surface hover:bg-surface2")}>{i}</button>
        ))}
      </div>
    </div>
  );
}
