import { ShieldCheck } from "lucide-react";
import { requireCtx } from "@/lib/session";
import { previewInvite } from "@/lib/core/circles";
import { getMembership } from "@/lib/core/shared";
import { formatINR } from "@/lib/domain/money";
import { RISK_DISCLOSURE } from "@/lib/domain/constants";
import { Card, EmptyState, LinkButton, Notice, PageHeader } from "@/components/ui";
import { JoinButton } from "@/components/client/join-form";

export const metadata = { title: "Join a circle" };

export default async function JoinCode({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { db, user } = await requireCtx();
  const p = previewInvite(db, code);
  if (!p) return <EmptyState icon={<ShieldCheck size={26} />} title="Code not found" body="Check the code with the circle admin and try again." action={<LinkButton href="/join">Try another code</LinkButton>} />;
  const already = !!getMembership(db, p.circle.id, user.id);
  const c = p.circle;
  return (
    <div>
      <PageHeader back="/join" title={`Join ${c.name}`} subtitle={`${p.memberCount} members · ${c.city} · admin ${p.adminName}`} />
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold">The rules you agree to</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-muted">Max loan</dt><dd className="num font-semibold">{formatINR(c.maxLoan)}</dd></div>
          <div><dt className="text-muted">Interest</dt><dd className="num font-semibold">{c.interestPct}% a year, simple</dd></div>
          <div><dt className="text-muted">Approval needed</dt><dd className="num font-semibold">{c.approvalThresholdPct}% of members</dd></div>
          <div><dt className="text-muted">Late penalty</dt><dd className="num font-semibold">{c.latePenaltyType === "flat" ? formatINR(c.latePenaltyValue) : `${c.latePenaltyValue}%`} per late instalment</dd></div>
        </dl>
        <Notice tone="warn" title="Lending carries risk">{RISK_DISCLOSURE} If a borrower defaults, lenders share the loss in proportion to what they lent.</Notice>
        {user.kycStatus !== "verified" ? <Notice tone="warn">Complete eKYC in your profile before joining.</Notice>
          : already ? <LinkButton href={`/circles/${c.id}`} full size="lg">You are in. Open circle</LinkButton>
          : <><JoinButton code={p.code} />
              {c.complianceMode === "A" && <LinkButton href={`/loans/new?circle=${c.id}`} variant="ghost" full>Or borrow as an outside, vetted borrower</LinkButton>}</>}
      </Card>
    </div>
  );
}
