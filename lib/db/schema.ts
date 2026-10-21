import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey();
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });

/** All money columns are INTEGER PAISE. */

export const users = sqliteTable("users", {
  id: id(),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  segment: text("segment").notNull(),
  vpa: text("vpa").notNull(),
  institution: text("institution"),
  kycStatus: text("kyc_status").notNull().default("none"), // none | verified
  /** Admin vetting flag, lets a verified user borrow as an external borrower. */
  vetted: integer("vetted", { mode: "boolean" }).notNull().default(false),
  isPlatformAdmin: integer("is_platform_admin", { mode: "boolean" }).notNull().default(false),
  demoPersona: text("demo_persona"), // student | admin | professional
  createdAt: ts("created_at").notNull(),
});

/** Masked only: never the raw PAN or Aadhaar. */
export const kycRecords = sqliteTable("kyc_records", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id),
  idType: text("id_type").notNull(), // pan | aadhaar
  maskedId: text("masked_id").notNull(),
  provider: text("provider").notNull().default("simulated"),
  verifiedAt: ts("verified_at"),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  createdAt: ts("created_at").notNull(),
});

export const circles = sqliteTable("circles", {
  id: id(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  city: text("city").notNull(),
  creatorId: text("creator_id").notNull().references(() => users.id),
  // Rules
  maxLoan: integer("max_loan").notNull(),
  interestPct: real("interest_pct").notNull(),
  approvalThresholdPct: integer("approval_threshold_pct").notNull(),
  latePenaltyType: text("late_penalty_type").notNull(), // flat | pct
  latePenaltyValue: real("late_penalty_value").notNull(), // flat: paise, pct: percent
  votingWindowHours: integer("voting_window_hours").notNull().default(48),
  complianceMode: text("compliance_mode").notNull().default("A"), // A partnered | C closed
  premium: integer("premium", { mode: "boolean" }).notNull().default(false),
  createdAt: ts("created_at").notNull(),
});

export const memberships = sqliteTable(
  "memberships",
  {
    id: id(),
    circleId: text("circle_id").notNull().references(() => circles.id),
    userId: text("user_id").notNull().references(() => users.id),
    role: text("role").notNull().default("member"), // admin | member
    status: text("status").notNull().default("active"), // active | removed
    joinedAt: ts("joined_at").notNull(),
  },
  (t) => [uniqueIndex("membership_unique").on(t.circleId, t.userId)],
);

export const invites = sqliteTable("invites", {
  id: id(),
  circleId: text("circle_id").notNull().references(() => circles.id),
  code: text("code").notNull().unique(),
  createdBy: text("created_by").notNull().references(() => users.id),
  uses: integer("uses").notNull().default(0),
  createdAt: ts("created_at").notNull(),
});

export const contributions = sqliteTable("contributions", {
  id: id(),
  circleId: text("circle_id").notNull().references(() => circles.id),
  userId: text("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  upiRef: text("upi_ref").notNull(),
  createdAt: ts("created_at").notNull(),
});

/** A loan request that, once approved and funded, becomes the loan. Rules are snapshotted at request time. */
export const loans = sqliteTable(
  "loans",
  {
    id: id(),
    circleId: text("circle_id").notNull().references(() => circles.id),
    borrowerId: text("borrower_id").notNull().references(() => users.id),
    amount: integer("amount").notNull(),
    purpose: text("purpose").notNull(),
    tenureMonths: integer("tenure_months").notNull(),
    interestPct: real("interest_pct").notNull(),
    note: text("note"),
    isExternal: integer("is_external", { mode: "boolean" }).notNull().default(false),
    // voting | approved | rejected | repaying | closed | defaulted
    status: text("status").notNull().default("voting"),
    // Snapshots, so later rule edits only affect NEW loans
    thresholdPct: integer("threshold_pct").notNull(),
    latePenaltyType: text("late_penalty_type").notNull(),
    latePenaltyValue: real("late_penalty_value").notNull(),
    platformFeePct: real("platform_fee_pct").notNull(),
    platformFee: integer("platform_fee").notNull(),
    complianceMode: text("compliance_mode").notNull(),
    votingEndsAt: ts("voting_ends_at").notNull(),
    riskScoreAtRequest: integer("risk_score_at_request"),
    restructuredAt: ts("restructured_at"),
    createdAt: ts("created_at").notNull(),
    approvedAt: ts("approved_at"),
    disbursedAt: ts("disbursed_at"),
    closedAt: ts("closed_at"),
    defaultedAt: ts("defaulted_at"),
  },
  (t) => [index("loans_circle").on(t.circleId), index("loans_borrower").on(t.borrowerId)],
);

export const votes = sqliteTable(
  "votes",
  {
    id: id(),
    loanId: text("loan_id").notNull().references(() => loans.id),
    userId: text("user_id").notNull().references(() => users.id),
    choice: text("choice").notNull(), // approve | reject
    comment: text("comment"),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [uniqueIndex("vote_unique").on(t.loanId, t.userId)],
);

export const comments = sqliteTable("comments", {
  id: id(),
  loanId: text("loan_id").notNull().references(() => loans.id),
  userId: text("user_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  kind: text("kind").notNull().default("comment"), // comment | mediation
  createdAt: ts("created_at").notNull(),
});

/** Disbursement split: each lender pays their share directly to the borrower via UPI. */
export const loanLenders = sqliteTable("loan_lenders", {
  id: id(),
  loanId: text("loan_id").notNull().references(() => loans.id),
  lenderId: text("lender_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"), // pending | paid | failed
  upiRef: text("upi_ref"),
  paidAt: ts("paid_at"),
});

export const instalments = sqliteTable(
  "instalments",
  {
    id: id(),
    loanId: text("loan_id").notNull().references(() => loans.id),
    number: integer("number").notNull(),
    dueDate: ts("due_date").notNull(),
    principal: integer("principal").notNull(),
    interest: integer("interest").notNull(),
    penalty: integer("penalty").notNull().default(0),
    penaltyChargedAt: ts("penalty_charged_at"),
    paidAt: ts("paid_at"),
    /** active | superseded (replaced by a restructure) */
    state: text("state").notNull().default("active"),
  },
  (t) => [index("instalments_loan").on(t.loanId)],
);

export const repayments = sqliteTable("repayments", {
  id: id(),
  loanId: text("loan_id").notNull().references(() => loans.id),
  instalmentId: text("instalment_id").notNull().references(() => instalments.id),
  payerId: text("payer_id").notNull().references(() => users.id),
  principal: integer("principal").notNull(),
  interest: integer("interest").notNull(),
  penalty: integer("penalty").notNull().default(0),
  method: text("method").notNull(), // autopay | manual
  upiRef: text("upi_ref").notNull(),
  createdAt: ts("created_at").notNull(),
});

/** Append-only. UPDATE and DELETE are blocked by database triggers (see migrations). */
export const ledgerEntries = sqliteTable(
  "ledger_entries",
  {
    id: id(),
    ref: text("ref").notNull().unique(),
    circleId: text("circle_id").notNull().references(() => circles.id),
    loanId: text("loan_id"),
    actorId: text("actor_id").notNull(),
    type: text("type").notNull(),
    amount: integer("amount").notNull(),
    status: text("status").notNull().default("success"),
    reversesType: text("reverses_type"),
    reversesRef: text("reverses_ref"),
    memo: text("memo"),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [index("ledger_circle").on(t.circleId, t.createdAt)],
);

export const mandates = sqliteTable("mandates", {
  id: id(),
  loanId: text("loan_id").notNull().references(() => loans.id),
  borrowerId: text("borrower_id").notNull().references(() => users.id),
  vpa: text("vpa").notNull(),
  status: text("status").notNull().default("active"), // active | paused | cancelled
  createdAt: ts("created_at").notNull(),
});

export const riskSnapshots = sqliteTable("risk_snapshots", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id),
  score: integer("score"),
  band: text("band"),
  factorsJson: text("factors_json").notNull(),
  createdAt: ts("created_at").notNull(),
});

export const notifications = sqliteTable(
  "notifications",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id),
    kind: text("kind").notNull(), // vote | due | overdue | approved | repaid | info
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    readAt: ts("read_at"),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [index("notif_user").on(t.userId, t.createdAt)],
);

export const restructureProposals = sqliteTable("restructure_proposals", {
  id: id(),
  loanId: text("loan_id").notNull().references(() => loans.id),
  proposerId: text("proposer_id").notNull().references(() => users.id),
  newMonths: integer("new_months").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"), // open | approved | rejected
  createdAt: ts("created_at").notNull(),
  decidedAt: ts("decided_at"),
});

export const restructureVotes = sqliteTable(
  "restructure_votes",
  {
    id: id(),
    proposalId: text("proposal_id").notNull().references(() => restructureProposals.id),
    userId: text("user_id").notNull().references(() => users.id),
    choice: text("choice").notNull(),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [uniqueIndex("rvote_unique").on(t.proposalId, t.userId)],
);

export const premiumSubscriptions = sqliteTable("premium_subscriptions", {
  id: id(),
  circleId: text("circle_id").notNull().references(() => circles.id),
  pricePerMonth: integer("price_per_month").notNull(),
  startedAt: ts("started_at").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const platformFees = sqliteTable("platform_fees", {
  id: id(),
  loanId: text("loan_id").notNull().references(() => loans.id),
  circleId: text("circle_id").notNull().references(() => circles.id),
  amount: integer("amount").notNull(),
  createdAt: ts("created_at").notNull(),
});

/** Simulated NPS survey answers for the Pilot Metrics page. */
export const npsResponses = sqliteTable("nps_responses", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id),
  score: integer("score").notNull(),
  createdAt: ts("created_at").notNull(),
});
