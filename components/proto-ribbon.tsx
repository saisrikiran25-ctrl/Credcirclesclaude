import { FlaskConical } from "lucide-react";

/** Persistent "simulated prototype" ribbon (spec: non-production mode). Quiet, but always there. */
export function ProtoRibbon() {
  return (
    <div role="note" className="no-print flex items-center justify-center gap-1.5 border-b border-line bg-surface2 px-3 py-1 text-center text-[11px] font-medium text-muted">
      <FlaskConical size={12} aria-hidden="true" />
      <span>Simulated prototype: UPI, eKYC and the NBFC-P2P partner are mocked. No real money moves.</span>
    </div>
  );
}
