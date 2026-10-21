export type VoteStatus = "pending" | "approved" | "rejected";

/**
 * Approvals needed = ceil(eligible x threshold / 100), in integer maths (no float edge cases:
 * 70% of 10 is exactly 7; 70% of 3 is 3; 70% of 7 is 5).
 */
export function requiredApprovals(eligible: number, thresholdPct: number): number {
  if (eligible <= 0) return Infinity; // nobody can approve
  return Math.floor((eligible * thresholdPct + 99) / 100);
}

export interface TallyInput {
  eligible: number; // members allowed to vote (borrower excluded when a member)
  thresholdPct: number;
  approvals: number;
  rejections: number;
  windowClosed?: boolean;
}

export interface Tally {
  required: number;
  approvals: number;
  rejections: number;
  abstained: number;
  progress: number; // 0..1 toward the threshold
  status: VoteStatus;
  reason: string;
}

/**
 * Approved as soon as approvals >= required. Rejected as soon as the threshold can no longer be
 * reached (even if everyone left voted yes), or when the window closes short of the threshold.
 */
export function tallyVotes(i: TallyInput): Tally {
  const required = requiredApprovals(i.eligible, i.thresholdPct);
  const abstained = Math.max(i.eligible - i.approvals - i.rejections, 0);
  const progress = Number.isFinite(required) && required > 0 ? Math.min(i.approvals / required, 1) : 0;
  let status: VoteStatus = "pending";
  let reason = `${i.approvals} of ${Number.isFinite(required) ? required : "?"} approvals needed`;
  if (Number.isFinite(required) && i.approvals >= required) {
    status = "approved";
    reason = `Threshold of ${i.thresholdPct}% reached`;
  } else if (!Number.isFinite(required) || i.approvals + abstained < required) {
    status = "rejected";
    reason = "Threshold can no longer be reached";
  } else if (i.windowClosed) {
    status = "rejected";
    reason = "Voting window closed below the threshold";
  }
  return { required, approvals: i.approvals, rejections: i.rejections, abstained, progress, status, reason };
}
