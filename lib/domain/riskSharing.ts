import { splitProportionally } from "./money";

export interface LenderShare {
  lenderId: string;
  amount: number; // paise this lender funded for the loan
}

/**
 * Loss on a defaulted loan = unpaid principal. Each lender bears it in proportion to the
 * amount they put into THAT loan (largest-remainder rounding, so shares add up exactly).
 */
export function shareLoss(lossPrincipal: number, funded: LenderShare[]): { lenderId: string; loss: number; pct: number }[] {
  const total = funded.reduce((a, l) => a + l.amount, 0);
  const losses = splitProportionally(Math.max(lossPrincipal, 0), funded.map((l) => l.amount));
  return funded.map((l, i) => ({
    lenderId: l.lenderId,
    loss: losses[i],
    pct: total === 0 ? 0 : (l.amount / total) * 100,
  }));
}

export interface LenderCandidate {
  lenderId: string;
  available: number; // contributed minus currently lent
}

/**
 * Default lender-split model: every selected lender funds a share proportional to their
 * available capacity. Throws when the group cannot cover the request.
 */
export function allocateLenders(amount: number, candidates: LenderCandidate[]): LenderShare[] {
  const usable = candidates.filter((c) => c.available > 0);
  const capacity = usable.reduce((a, c) => a + c.available, 0);
  if (capacity < amount) throw new Error("Not enough available capacity among selected lenders");
  const parts = splitProportionally(amount, usable.map((c) => c.available));
  return usable
    .map((c, i) => ({ lenderId: c.lenderId, amount: parts[i] }))
    .filter((s) => s.amount > 0);
}
