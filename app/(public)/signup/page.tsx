import { redirect } from "next/navigation";
import Link from "next/link";
import { getCtx } from "@/lib/session";
import { APP_NAME } from "@/lib/config";
import { Wordmark } from "@/components/ui";
import { SignupWizard } from "@/components/client/signup-wizard";
import { ProtoRibbon } from "@/components/proto-ribbon";

export const metadata = { title: "Sign up" };

export default async function SignupPage() {
  const { user } = await getCtx();
  if (user) redirect("/home");
  return (
    <>
      <ProtoRibbon />
      <main id="main" className="mx-auto max-w-md px-5 py-8">
        <Link href="/" aria-label={`${APP_NAME} home`}><Wordmark name={APP_NAME} /></Link>
        <div className="mt-6"><SignupWizard /></div>
        <p className="mt-6 text-center text-sm text-muted">Already have an account? <Link href="/login" className="font-semibold text-brand underline">Log in</Link></p>
      </main>
    </>
  );
}
