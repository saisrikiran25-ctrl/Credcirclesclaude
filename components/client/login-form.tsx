"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { btnClass } from "@/components/ui";
import { TextInput } from "./form-bits";
import { useToast } from "./toast";

export function LoginForm() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const { show } = useToast();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        start(async () => {
          const r = await login(phone.replace(/\s/g, ""), otp);
          if (r.ok && r.redirectTo) router.push(r.redirectTo);
          else if (!r.ok) { setError(r.error); show(r.error, "error"); }
        });
      }}
    >
      <TextInput label="Mobile number" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="98765 00001" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
      <TextInput label="OTP" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} hint="Demo OTP: 123456 (any 6 digits work)." error={error} />
      <button type="submit" disabled={pending || phone.length !== 10 || otp.length !== 6} className={btnClass("primary", "lg", true)}>
        {pending && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} Log in
      </button>
    </form>
  );
}
