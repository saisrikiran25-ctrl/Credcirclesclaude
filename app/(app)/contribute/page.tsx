import { requireCtx } from "@/lib/session";
import { myCircles } from "@/lib/core/position";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { ContributeForm } from "@/components/client/contribute-form";
import { PiggyBank } from "lucide-react";

export const metadata = { title: "Contribute" };

export default async function ContributePage({ searchParams }: { searchParams: Promise<{ circle?: string }> }) {
  const { db, user } = await requireCtx();
  const sp = await searchParams;
  const circles = myCircles(db, user.id);
  return (
    <div>
      <PageHeader back="/home" title="Add to the pool" subtitle="Your contribution is what you can lend. It is a ledger commitment, not a deposit." />
      {circles.length === 0
        ? <EmptyState icon={<PiggyBank size={26} />} title="Join a circle first" body="Contributions go to a circle's pool." action={<LinkButton href="/circles/new">Create a circle</LinkButton>} />
        : <ContributeForm circles={circles.map((c) => ({ id: c.id, name: c.name }))} defaultId={sp.circle} userVpa={user.vpa} />}
    </div>
  );
}
