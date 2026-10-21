"use client";

import { useState } from "react";
import { LIMITS } from "@/lib/domain/constants";
import { formatINR } from "@/lib/domain/money";
import { contributeAction } from "@/lib/actions/circles";
import { Card } from "@/components/ui";
import { Chips, RupeeInput, SelectInput } from "./form-bits";
import { UpiPayButton } from "./upi-sheet";

export function ContributeForm({ circles, defaultId, userVpa }: { circles: { id: string; name: string }[]; defaultId?: string; userVpa: string }) {
  const [circleId, setCircleId] = useState(defaultId && circles.some((c) => c.id === defaultId) ? defaultId : circles[0]?.id ?? "");
  const [rupees, setRupees] = useState("1000");
  const paise = Math.round(Number(rupees) * 100);
  const valid = Number.isFinite(paise) && paise >= LIMITS.contributionMin && paise <= LIMITS.contributionMax;
  const circle = circles.find((c) => c.id === circleId);
  return (
    <Card className="space-y-4">
      {circles.length > 1 && (
        <SelectInput label="Circle" value={circleId} onChange={(e) => setCircleId(e.target.value)}>
          {circles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectInput>
      )}
      <Chips label="Quick amounts" value={rupees} onChange={setRupees} options={["500", "1000", "2000", "5000"].map((v) => ({ id: v, label: formatINR(Number(v) * 100) }))} />
      <RupeeInput label="Amount" value={rupees} onChange={setRupees} min={500} max={5000} step={100} error={rupees && !valid ? "Contributions are ₹500 to ₹5,000." : undefined} hint="₹500 to ₹5,000 per contribution." />
      <p className="rounded-2xl bg-surface2 p-4 text-sm text-muted">
        <strong className="text-fg">Your money stays in your bank account.</strong> This records your commitment to the pool ledger. You confirm it with a UPI payment from <span className="num">{userVpa}</span>; nothing is held by Circlo.
      </p>
      {valid && circle && (
        <UpiPayButton
          label={`Contribute ${formatINR(paise)}`}
          title="Confirm contribution"
          payeeName={circle.name}
          payeeVpa={`${circle.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}@circle`}
          amount={paise}
          note="Circle contribution"
          payAction={(o) => contributeAction(circleId, paise, o)}
          successText="Added to the circle ledger"
          doneHref={`/circles/${circleId}`}
        />
      )}
    </Card>
  );
}
