"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CircleCheck, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = { id: number; tone: "ok" | "error"; text: string };
const Ctx = createContext<{ show: (text: string, tone?: Toast["tone"]) => void }>({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const show = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, tone, text }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), tone === "error" ? 7000 : 4000);
  }, []);
  const value = useMemo(() => ({ show }), [show]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex max-w-md items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg",
              t.tone === "error" ? "bg-neg text-white" : "bg-fg text-bg",
            )}
          >
            {t.tone === "error" ? <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> : <CircleCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />}
            <span>{t.text}</span>
            <button type="button" aria-label="Dismiss" className="-mr-1 ml-1 shrink-0 opacity-70 hover:opacity-100" onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
