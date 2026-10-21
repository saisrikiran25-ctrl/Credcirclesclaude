export interface UpiLinkInput {
  payeeVpa: string; // lender pays the borrower: payee = borrower's VPA
  payeeName: string;
  amountPaise: number;
  note: string;
  reference: string;
}

/**
 * Standard UPI deep link. Amount is rupees with 2 decimals; note is URL-encoded.
 * For a disbursement the payer (lender) opens this and the payee is the borrower's VPA;
 * for a manual repayment the payee is the lender's VPA.
 */
export function buildUpiLink(i: UpiLinkInput): string {
  const params = new URLSearchParams({
    pa: i.payeeVpa,
    pn: i.payeeName,
    am: (i.amountPaise / 100).toFixed(2),
    cu: "INR",
    tn: i.note.slice(0, 80),
    tr: i.reference,
  });
  return `upi://pay?${params.toString().replace(/\+/g, "%20")}`;
}
