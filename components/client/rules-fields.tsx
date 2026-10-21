"use client";

import { useState } from "react";
import { LIMITS } from "@/lib/domain/constants";
import { Chips, RupeeInput, TextInput } from "./form-bits";

export interface RulesState {
  maxLoan: string; // rupees
  interestPct: string;
  approvalThresholdPct: string;
  latePenaltyType: "flat" | "pct";
  latePenaltyValue: string; // rupees (flat) or percent
  votingWindowHours: string;
}

export const defaultRules = (): RulesState => ({
  maxLoan: "10000",
  interestPct: String(LIMITS.interestDefaultPct),
  approvalThresholdPct: String(LIMITS.approvalDefaultPct),
  latePenaltyType: "flat",
  latePenaltyValue: "50",
  votingWindowHours: String(LIMITS.votingWindowHours),
});

export function useRules(initial?: RulesState) {
  return useState<RulesState>(initial ?? defaultRules());
}

/** Converts form state to the shape the server validates (money in paise). */
export function rulesPayload(r: RulesState) {
  return {
    maxLoan: Math.round(Number(r.maxLoan) * 100),
    interestPct: Number(r.interestPct),
    approvalThresholdPct: Number(r.approvalThresholdPct),
    latePenaltyType: r.latePenaltyType,
    latePenaltyValue: r.latePenaltyType === "flat" ? Math.round(Number(r.latePenaltyValue) * 100) : Number(r.latePenaltyValue),
    votingWindowHours: Number(r.votingWindowHours),
  };
}

export function RulesFields({ value, onChange }: { value: RulesState; onChange: (v: RulesState) => void }) {
  const set = <K extends keyof RulesState>(k: K, v: RulesState[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-4">
      <RupeeInput label="Maximum loan per member" value={value.maxLoan} onChange={(v) => set("maxLoan", v)} min={LIMITS.loanMin / 100} max={LIMITS.loanMax / 100} step={500} hint="Pilot range: ₹5,000 to ₹20,000." />
      <TextInput label="Interest, % per year (simple)" type="number" step="0.5" min={LIMITS.interestMinPct} max={LIMITS.interestMaxPct} value={value.interestPct} onChange={(e) => set("interestPct", e.target.value)} hint="Policy band: 8% to 12%. Interest is charged on the original amount, not compounded." />
      <TextInput label="Approval needed, % of voting members" type="number" min={LIMITS.approvalMinPct} max={LIMITS.approvalMaxPct} value={value.approvalThresholdPct} onChange={(e) => set("approvalThresholdPct", e.target.value)} hint="Default 70%. The borrower does not vote on their own loan." />
      <Chips label="Late payment penalty" value={value.latePenaltyType} onChange={(v) => set("latePenaltyType", v)} options={[{ id: "flat", label: "Flat amount" }, { id: "pct", label: "% of instalment" }]} />
      {value.latePenaltyType === "flat"
        ? <RupeeInput label="Penalty per late instalment" value={value.latePenaltyValue} onChange={(v) => set("latePenaltyValue", v)} min={0} max={1000} step={10} />
        : <TextInput label="Penalty, % of the instalment" type="number" step="0.5" min={0} value={value.latePenaltyValue} onChange={(e) => set("latePenaltyValue", e.target.value)} />}
      <TextInput label="Voting window (hours)" type="number" min={1} max={168} value={value.votingWindowHours} onChange={(e) => set("votingWindowHours", e.target.value)} hint="After this, the vote is counted as it stands." />
    </div>
  );
}

export const rulesFromCircle = (c: { maxLoan: number; interestPct: number; approvalThresholdPct: number; latePenaltyType: string; latePenaltyValue: number; votingWindowHours: number }): RulesState => ({
  maxLoan: String(c.maxLoan / 100),
  interestPct: String(c.interestPct),
  approvalThresholdPct: String(c.approvalThresholdPct),
  latePenaltyType: c.latePenaltyType === "pct" ? "pct" : "flat",
  latePenaltyValue: String(c.latePenaltyType === "pct" ? c.latePenaltyValue : c.latePenaltyValue / 100),
  votingWindowHours: String(c.votingWindowHours),
});
