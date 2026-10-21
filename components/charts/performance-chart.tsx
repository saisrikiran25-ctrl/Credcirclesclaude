"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatINR, formatINRCompact } from "@/lib/domain/money";

export function PerformanceChart({ data }: { data: { date: string; pool: number; outstanding: number }[] }) {
  return (
    <div role="img" aria-label={`Circle capital over time. Latest total ${formatINR(data.at(-1)?.pool ?? 0)}, of which ${formatINR(data.at(-1)?.outstanding ?? 0)} is lent out.`} className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => formatINRCompact(v)} />
          <Tooltip formatter={(v) => formatINR(Number(v))} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--fg)" }} />
          <Area type="monotone" dataKey="pool" name="Total capital" stroke="var(--brand)" fill="var(--brand)" fillOpacity={0.15} strokeWidth={2} />
          <Area type="monotone" dataKey="outstanding" name="Lent out" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.3} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
