import { aadhaarSchema, maskId, panSchema } from "@/lib/domain/validation";
import { buildUpiLink } from "@/lib/domain/upi";
import type { KycService, PartnerEscrowService, UpiService } from "./interfaces";

export const DEMO_OTP = "123456";

export const simulatedKyc: KycService = {
  async startVerification({ idType, idNumber }) {
    const parsed = (idType === "pan" ? panSchema : aadhaarSchema).safeParse(idNumber);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid ID" };
    // Only the masked value leaves this function; the raw number is not stored anywhere.
    return { ok: true, maskedId: maskId(parsed.data), demoOtp: DEMO_OTP };
  },
  async confirmOtp({ otp }) {
    // Demo mode: any 6-digit code works.
    return /^\d{6}$/.test(otp) ? { ok: true } : { ok: false, error: "Enter the 6-digit code" };
  },
};

let counter = 0;
const nextRef = (prefix: string) =>
  `${prefix}${Date.now().toString(36).toUpperCase()}${(counter++ % 1296).toString(36).toUpperCase().padStart(2, "0")}`;

export const simulatedUpi: UpiService = {
  buildLink: (r) =>
    buildUpiLink({ payeeVpa: r.payeeVpa, payeeName: r.payeeName, amountPaise: r.amountPaise, note: r.note, reference: r.reference }),
  async settle(_req, outcome) {
    if (outcome === "success") return { status: "success", upiRef: nextRef("UPI") };
    return { status: "failed", upiRef: nextRef("UPF"), reason: "Payment declined by the bank (simulated)" };
  },
  async registerMandate() {
    return { mandateRef: nextRef("MND") };
  },
};

const PARTNER = "Sample NBFC-P2P Partner (simulated)";

export const simulatedEscrow: PartnerEscrowService = {
  statusFor({ loanStatus, hasDisbursed }) {
    const closed = loanStatus === "closed";
    const tracking = hasDisbursed || loanStatus === "repaying" || loanStatus === "defaulted" || closed;
    const approved = loanStatus !== "voting" && loanStatus !== "rejected";
    return {
      partnerName: PARTNER,
      stages: [
        { stage: "kyc_cleared", label: "Borrower and lenders KYC cleared", done: true },
        { stage: "escrow_ready", label: "Escrow account ready", done: approved },
        { stage: "funds_routed", label: "Lender-to-borrower payment recorded", done: tracking },
        { stage: "repayment_tracking", label: "Repayment tracking active", done: tracking },
        { stage: "closed", label: "Loan closed and reconciled", done: closed },
      ],
    };
  },
};

export const services = { kyc: simulatedKyc, upi: simulatedUpi, escrow: simulatedEscrow };
