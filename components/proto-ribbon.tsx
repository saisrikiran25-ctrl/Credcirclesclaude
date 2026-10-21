import { FlaskConical } from "lucide-react";

/** Persistent "simulated prototype" ribbon (spec: non-production mode). */
export function ProtoRibbon() {
  return (
    <div role="note" className="no-print flex items-center justify-center gap-2 bg-fg px-3 py-1.5 text-center text-[11px] font-semibold text-bg">
      <FlaskConical size={13} aria-hidden="true" />
      Simulated prototype: UPI, eKYC and the NBFC-P2P partner are mocked. No real money moves.
    </div>
  );
}
