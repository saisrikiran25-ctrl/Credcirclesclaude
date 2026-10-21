import { redirect } from "next/navigation";
import Link from "next/link";
import { getCtx } from "@/lib/session";
import { APP_NAME } from "@/lib/config";
import { Card, PageHeader, Wordmark } from "@/components/ui";
import { PersonaButtons } from "@/components/client/persona-buttons";
import { LoginForm } from "@/components/client/login-form";
import { ProtoRibbon } from "@/components/proto-ribbon";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  const { user } = await getCtx();
  if (user) redirect("/home");
  return (
    <>
      <ProtoRibbon />
      <main id="main" className="mx-auto max-w-md px-5 py-8">
        <Link href="/" aria-label={`${APP_NAME} home`}><Wordmark name={APP_NAME} /></Link>
        <div className="mt-8"><PageHeader title="Welcome back" subtitle="Log in with your mobile number." /></div>
        <Card><LoginForm /></Card>
        <Card className="mt-4">
          <h2 className="font-display font-semibold">Or jump in as a demo person</h2>
          <p className="mb-3 mt-1 text-sm text-muted">One tap, no OTP.</p>
          <PersonaButtons compact />
        </Card>
        <p className="mt-6 text-center text-sm text-muted">New here? <Link href="/signup" className="font-semibold text-brand underline">Create an account</Link></p>
      </main>
    </>
  );
}
