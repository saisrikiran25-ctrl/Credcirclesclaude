import { requireCtx } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { CreateCircleForm } from "@/components/client/create-circle-form";

export const metadata = { title: "Create a circle" };

export default async function NewCircle() {
  const { user } = await requireCtx();
  return (
    <div>
      <PageHeader back="/circles" title="Create a circle" subtitle="Set the rules once. Everyone who joins agrees to them." />
      {user.kycStatus !== "verified"
        ? <p className="rounded-2xl bg-warnsoft p-4 text-sm">Complete eKYC in your profile before creating a circle.</p>
        : <CreateCircleForm defaultCity={user.city} />}
    </div>
  );
}
