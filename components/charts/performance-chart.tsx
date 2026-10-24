"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatINR, formatINRCompact } from "@/lib/domain/money";

export function PerformanceChart({ data, height = 220 }: { data: { date: string; pool: number; outstanding: number }[]; height?: number }) {
  return (
    <div role="img" aria-label={`Circle capital over time. Latest total ${formatINR(data.at(-1)?.pool ?? 0)}, of which ${formatINR(data.at(-1)?.outstanding ?? 0)} is lent out.`} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 4, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="capFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--green)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--green)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={32} />
          <YAxis orientation="right" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => formatINRCompact(v)} />
          <Tooltip formatter={(v) => formatINR(Number(v))} cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--fg)", fontSize: 12 }} />
          <Area type="monotone" dataKey="pool" name="Total capital" stroke="var(--green)" fill="url(#capFill)" strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="outstanding" name="Lent out" stroke="var(--accent)" fill="none" strokeWidth={1.75} strokeDasharray="4 3" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
