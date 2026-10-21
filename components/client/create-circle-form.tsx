"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CIRCLE_TYPES, CITIES } from "@/lib/config";
import { createCircleAction } from "@/lib/actions/circles";
import { Card, btnClass } from "@/components/ui";
import { Chips, SelectInput, TextInput } from "./form-bits";
import { RulesFields, rulesPayload, useRules } from "./rules-fields";
import { useToast } from "./toast";

export function CreateCircleForm({ defaultCity }: { defaultCity: string }) {
  const [type, setType] = useState<string>("friends");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState(defaultCity);
  const [rules, setRules] = useRules();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const { show } = useToast();

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        start(async () => {
          const r = await createCircleAction({ type, name, description: description || undefined, city, rules: rulesPayload(rules) });
          if (r.ok && r.redirectTo) router.push(r.redirectTo);
          else if (!r.ok) { setError(r.error); show(r.error, "error"); }
        });
      }}
    >
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold">1. About the circle</h2>
        <Chips label="Circle type" value={type} onChange={setType} options={CIRCLE_TYPES.map((t) => ({ id: t.id, label: t.label }))} />
        <TextInput label="Circle name" placeholder="e.g. Block C Hostel Circle" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
        <TextInput label="Short description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
        <SelectInput label="City" value={city} onChange={(e) => setCity(e.target.value)}>
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </SelectInput>
      </Card>
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold">2. The rules everyone agrees to</h2>
        <p className="-mt-2 text-sm text-muted">These are saved on every loan at the time it is requested, so later edits never change a loan already in progress.</p>
        <RulesFields value={rules} onChange={setRules} />
      </Card>
      {error && <p role="alert" className="text-sm font-medium text-neg">{error}</p>}
      <button type="submit" disabled={pending || name.trim().length < 3} className={btnClass("accent", "lg", true)}>
        {pending && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} Create circle and get invite code
      </button>
    </form>
  );
}
