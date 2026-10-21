/**
 * Simulation boundary. Everything that would touch a bank, UPI, the UIDAI/NSDL KYC network or a
 * licensed NBFC-P2P partner lives behind these interfaces. The prototype ships `simulated.ts`;
 * a real provider only has to implement the same shapes.
 */

export type IdType = "pan" | "aadhaar";

export interface KycService {
  /** Format-check an ID and start an OTP step. Never stores or returns the raw number. */
  startVerification(input: { idType: IdType; idNumber: string }): Promise<
    { ok: true; maskedId: string; demoOtp: string } | { ok: false; error: string }
  >;
  confirmOtp(input: { otp: string }): Promise<{ ok: boolean; error?: string }>;
}

export interface UpiCollectRequest {
  payerVpa: string;
  payeeVpa: string;
  payeeName: string;
  amountPaise: number;
  note: string;
  reference: string;
}

export interface UpiService {
  /** A `upi://pay` deep link with amount and note pre-filled. */
  buildLink(req: UpiCollectRequest): string;
  /**
   * Simulated payment. In production the lender's UPI app performs the payment and a webhook or
   * status check confirms it; the platform never moves the money.
   */
  settle(req: UpiCollectRequest, outcome: "success" | "failure"): Promise<
    { status: "success"; upiRef: string } | { status: "failed"; upiRef: string; reason: string }
  >;
  /** Simulated UPI AutoPay mandate registration. */
  registerMandate(input: { vpa: string; maxAmountPaise: number }): Promise<{ mandateRef: string }>;
}

export type EscrowStage = "kyc_cleared" | "escrow_ready" | "funds_routed" | "repayment_tracking" | "closed";

export interface PartnerEscrowService {
  /** Partner compliance status for a loan (Mode A, "Processed via licensed NBFC-P2P partner"). */
  statusFor(input: { loanStatus: string; hasDisbursed: boolean }): {
    partnerName: string;
    stages: { stage: EscrowStage; label: string; done: boolean }[];
  };
}
