"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "system" | "light" | "dark";

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    try { setMode((localStorage.getItem("circlo-theme") as Mode) || "system"); } catch { /* storage blocked */ }
  }, []);
  const apply = (m: Mode) => {
    setMode(m);
    try { m === "system" ? localStorage.removeItem("circlo-theme") : localStorage.setItem("circlo-theme", m); } catch { /* ignore */ }
    if (m === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", m);
  };
  const opts: { m: Mode; label: string; icon: typeof Sun }[] = [
    { m: "system", label: "Auto", icon: SunMoon }, { m: "light", label: "Light", icon: Sun }, { m: "dark", label: "Dark", icon: Moon },
  ];
  return (
    <div role="radiogroup" aria-label="Colour theme" className="inline-flex rounded-full bg-surface2 p-1">
      {opts.map(({ m, label, icon: Icon }) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={() => apply(m)}
          className={cn("flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold", mode === m ? "bg-surface text-fg shadow-sm" : "text-muted")}
        >
          <Icon size={16} aria-hidden="true" /> {label}
        </button>
      ))}
    </div>
  );
}
