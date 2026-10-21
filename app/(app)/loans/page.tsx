import { and, eq } from "drizzle-orm";
import { HandCoins } from "lucide-react";
import { requireCtx } from "@/lib/session";
import { schema } from "@/lib/db";
import { myLoans } from "@/lib/core/position";
import { displayStatus } from "@/lib/core/loans";
import { instalmentStatus } from "@/lib/domain/emi";
import { EmptyState, LinkButton, PageHeader, SectionTitle } from "@/components/ui";
import { LoanListItem } from "@/components/loan-bits";

export const metadata = { title: "Lend / Borrow" };

export default async function LoansPage() {
  const { db, user, now } = await requireCtx();
  const rows = myLoans(db, user.id).map((r) => {
    const overdue = r.loan.status === "repaying" && db.select().from(schema.instalments).where(and(eq(schema.instalments.loanId, r.loan.id), eq(schema.instalments.state, "active"))).all().some((i) => !i.paidAt && instalmentStatus(i.dueDate, now, false) === "overdue");
    return { ...r, status: displayStatus(r.loan, overdue) };
  });
  const mine = rows.filter((r) => r.mine);
  const lending = rows.filter((r) => !r.mine && r.lending);
  const others = rows.filter((r) => !r.mine && !r.lending);
  const section = (title: string, list: typeof rows) => list.length > 0 && (
    <>
      <SectionTitle>{title}</SectionTitle>
      <div className="space-y-3">{list.map((r) => <LoanListItem key={r.loan.id} href={`/loans/${r.loan.id}`} borrowerName={r.mine ? "You" : r.borrowerName} circleName={r.circleName} amount={r.loan.amount} purpose={r.loan.purpose} status={r.status} />)}</div>
    </>
  );
  return (
    <div>
      <PageHeader title="Lend and borrow" subtitle="Loans between members of your circles." action={<LinkButton href="/loans/new" size="sm">Request</LinkButton>} />
      {rows.length === 0 ? <EmptyState icon={<HandCoins size={26} />} title="No loans yet" body="Request a loan from a circle you are in, or vote on a friend's request." action={<LinkButton href="/loans/new">Request a loan</LinkButton>} /> : (
        <>
          {section("Your borrowing", mine)}
          {section("You are lending on", lending)}
          {section("Other loans in your circles", others)}
        </>
      )}
    </div>
  );
}
