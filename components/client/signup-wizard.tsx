"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2 } from "lucide-react";
import { CITIES, SEGMENTS } from "@/lib/config";
import { completeSignup, confirmKyc, startKyc, startSignup, verifyPhoneOtp } from "@/lib/actions/auth";
import { Badge, Card, Notice, btnClass } from "@/components/ui";
import { Chips, SelectInput, TextInput } from "./form-bits";
import { useToast } from "./toast";
import { cn } from "@/lib/utils";

const STEPS = ["Mobile", "Identity", "Profile"] as const;

export function SignupWizard() {
  const [step, setStep] = useState(0);
  // step 0
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  // step 1
  const [idType, setIdType] = useState<"pan" | "aadhaar">("pan");
  const [idNumber, setIdNumber] = useState("");
  const [maskedId, setMaskedId] = useState("");
  const [kycOtp, setKycOtp] = useState("");
  const [kycToken, setKycToken] = useState("");
  // step 2
  const [name, setName] = useState("");
  const [city, setCity] = useState<string>("Hyderabad");
  const [segment, setSegment] = useState<string>("student");
  const [vpa, setVpa] = useState("");
  const [institution, setInstitution] = useState("");

  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const { show } = useToast();

  const run = (fn: () => Promise<void>) => { setError(""); start(fn); };
  const fail = (msg: string) => { setError(msg); show(msg, "error"); };

  return (
    <div>
      <ol className="mb-5 flex items-center gap-2" aria-label="Sign-up progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2" aria-current={i === step ? "step" : undefined}>
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold", i <= step ? "bg-brand text-onbrand" : "bg-surface2 text-muted")}>{i < step ? "✓" : i + 1}</span>
            <span className={cn("text-xs font-semibold", i === step ? "text-fg" : "text-muted")}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-0.5 flex-1 rounded bg-line" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card>
          <h1 className="font-display text-2xl font-semibold">Your mobile number</h1>
          <p className="mb-4 mt-1 text-sm text-muted">We use it to log you in and to keep circles to verified people only.</p>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                if (!otpSent) {
                  const r = await startSignup(phone);
                  if (r.ok) setOtpSent(true); else fail(r.error);
                } else {
                  const r = await verifyPhoneOtp(otp);
                  if (r.ok) setStep(1); else fail(r.error);
                }
              });
            }}
          >
            <TextInput label="Mobile number" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="98765 43210" value={phone} disabled={otpSent} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
            {otpSent && (
              <>
                <Notice tone="info">Demo OTP: <strong className="num">123456</strong>. Any 6-digit code works in this prototype.</Notice>
                <TextInput label="Enter the 6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} error={error} />
              </>
            )}
            {!otpSent && error && <p role="alert" className="text-sm font-medium text-neg">{error}</p>}
            <button type="submit" disabled={pending || phone.length !== 10 || (otpSent && otp.length !== 6)} className={btnClass("primary", "lg", true)}>
              {pending && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} {otpSent ? "Verify" : "Send code"}
            </button>
          </form>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <h1 className="font-display text-2xl font-semibold">Verify your identity</h1>
          <p className="mb-4 mt-1 text-sm text-muted">Circles are verified-members only. This is a simulated eKYC step.</p>
          {kycToken ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-possoft p-4">
                <BadgeCheck className="text-pos" size={28} aria-hidden="true" />
                <div><div className="font-semibold">Verified</div><div className="num text-sm text-muted">{idType === "pan" ? "PAN" : "Aadhaar"} {maskedId}</div></div>
                <Badge tone="pos" className="ml-auto">eKYC</Badge>
              </div>
              <p className="text-xs text-muted">We keep only the last 4 characters. The full number is never stored.</p>
              <button type="button" className={btnClass("primary", "lg", true)} onClick={() => setStep(2)}>Continue</button>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  if (!maskedId) {
                    const r = await startKyc(idType, idNumber);
                    if (r.ok) { setMaskedId(String(r.data?.maskedId)); setIdNumber(""); /* raw number leaves memory */ }
                    else fail(r.error);
                  } else {
                    const r = await confirmKyc(phone, idType, maskedId, kycOtp);
                    if (r.ok) setKycToken(String(r.data?.token)); else fail(r.error);
                  }
                });
              }}
            >
              <Chips label="ID type" value={idType} onChange={(v) => { setIdType(v); setIdNumber(""); setMaskedId(""); }} options={[{ id: "pan", label: "PAN" }, { id: "aadhaar", label: "Aadhaar" }]} />
              {!maskedId ? (
                <>
                  <TextInput
                    label={idType === "pan" ? "PAN number" : "Aadhaar number"}
                    placeholder={idType === "pan" ? "ABCDE1234F" : "2345 6789 0123"}
                    autoCapitalize="characters"
                    maxLength={idType === "pan" ? 10 : 14}
                    value={idNumber}
                    onChange={(e) => setIdNumber(idType === "pan" ? e.target.value.toUpperCase() : e.target.value.replace(/[^\d ]/g, ""))}
                    hint="Prototype: only the format is checked. Please do not enter your real number."
                    error={error}
                  />
                </>
              ) : (
                <>
                  <Notice tone="info">ID accepted as <strong className="num">{maskedId}</strong>. Demo OTP: <strong className="num">123456</strong>.</Notice>
                  <TextInput label="Enter the 6-digit code" inputMode="numeric" maxLength={6} value={kycOtp} onChange={(e) => setKycOtp(e.target.value.replace(/\D/g, ""))} error={error} />
                </>
              )}
              <button type="submit" disabled={pending || (!maskedId ? idNumber.replace(/\s/g, "").length < 10 : kycOtp.length !== 6)} className={btnClass("primary", "lg", true)}>
                {pending && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} {maskedId ? "Verify" : "Check ID"}
              </button>
            </form>
          )}
        </Card>
      )}

      {step === 2 && (
        <Card>
          <h1 className="font-display text-2xl font-semibold">About you</h1>
          <p className="mb-4 mt-1 text-sm text-muted">Circle members see your name and verified badge.</p>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const r = await completeSignup({ phone, kycToken, name, city, segment, vpa, institution });
                if (r.ok && r.redirectTo) router.push(r.redirectTo); else if (!r.ok) fail(r.error);
              });
            }}
          >
            <TextInput label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            <SelectInput label="City" value={city} onChange={(e) => setCity(e.target.value)} hint="Pilot focus: Hyderabad.">
              {CITIES.map((c) => <option key={c}>{c}</option>)}
            </SelectInput>
            <Chips label="I am a…" value={segment} onChange={setSegment} options={SEGMENTS.map((s) => ({ id: s.id, label: s.label }))} />
            <TextInput label="UPI ID (VPA)" autoCapitalize="none" placeholder="yourname@upi" value={vpa} onChange={(e) => setVpa(e.target.value)} hint="Loans are paid to and from this UPI ID." />
            <TextInput label="Institution or employer (optional)" value={institution} onChange={(e) => setInstitution(e.target.value)} />
            {error && <p role="alert" className="text-sm font-medium text-neg">{error}</p>}
            <button type="submit" disabled={pending || name.trim().length < 2 || !vpa.includes("@")} className={btnClass("accent", "lg", true)}>
              {pending && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} Create my account
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}
