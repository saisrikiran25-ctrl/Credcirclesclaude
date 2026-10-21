CREATE TABLE `circles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`city` text NOT NULL,
	`creator_id` text NOT NULL,
	`max_loan` integer NOT NULL,
	`interest_pct` real NOT NULL,
	`approval_threshold_pct` integer NOT NULL,
	`late_penalty_type` text NOT NULL,
	`late_penalty_value` real NOT NULL,
	`voting_window_hours` integer DEFAULT 48 NOT NULL,
	`compliance_mode` text DEFAULT 'A' NOT NULL,
	`premium` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`kind` text DEFAULT 'comment' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`circle_id` text NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`upi_ref` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `instalments` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`number` integer NOT NULL,
	`due_date` integer NOT NULL,
	`principal` integer NOT NULL,
	`interest` integer NOT NULL,
	`penalty` integer DEFAULT 0 NOT NULL,
	`penalty_charged_at` integer,
	`paid_at` integer,
	`state` text DEFAULT 'active' NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `instalments_loan` ON `instalments` (`loan_id`);--> statement-breakpoint
CREATE TABLE `invites` (
	`id` text PRIMARY KEY NOT NULL,
	`circle_id` text NOT NULL,
	`code` text NOT NULL,
	`created_by` text NOT NULL,
	`uses` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invites_code_unique` ON `invites` (`code`);--> statement-breakpoint
CREATE TABLE `kyc_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`id_type` text NOT NULL,
	`masked_id` text NOT NULL,
	`provider` text DEFAULT 'simulated' NOT NULL,
	`verified_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`ref` text NOT NULL,
	`circle_id` text NOT NULL,
	`loan_id` text,
	`actor_id` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'success' NOT NULL,
	`reverses_type` text,
	`reverses_ref` text,
	`memo` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_entries_ref_unique` ON `ledger_entries` (`ref`);--> statement-breakpoint
CREATE INDEX `ledger_circle` ON `ledger_entries` (`circle_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `loan_lenders` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`lender_id` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`upi_ref` text,
	`paid_at` integer,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `loans` (
	`id` text PRIMARY KEY NOT NULL,
	`circle_id` text NOT NULL,
	`borrower_id` text NOT NULL,
	`amount` integer NOT NULL,
	`purpose` text NOT NULL,
	`tenure_months` integer NOT NULL,
	`interest_pct` real NOT NULL,
	`note` text,
	`is_external` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'voting' NOT NULL,
	`threshold_pct` integer NOT NULL,
	`late_penalty_type` text NOT NULL,
	`late_penalty_value` real NOT NULL,
	`platform_fee_pct` real NOT NULL,
	`platform_fee` integer NOT NULL,
	`compliance_mode` text NOT NULL,
	`voting_ends_at` integer NOT NULL,
	`risk_score_at_request` integer,
	`restructured_at` integer,
	`created_at` integer NOT NULL,
	`approved_at` integer,
	`disbursed_at` integer,
	`closed_at` integer,
	`defaulted_at` integer,
	FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`borrower_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `loans_circle` ON `loans` (`circle_id`);--> statement-breakpoint
CREATE INDEX `loans_borrower` ON `loans` (`borrower_id`);--> statement-breakpoint
CREATE TABLE `mandates` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`borrower_id` text NOT NULL,
	`vpa` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`borrower_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`circle_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `membership_unique` ON `memberships` (`circle_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`href` text,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notif_user` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `nps_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`score` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `platform_fees` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`circle_id` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `premium_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`circle_id` text NOT NULL,
	`price_per_month` integer NOT NULL,
	`started_at` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `repayments` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`instalment_id` text NOT NULL,
	`payer_id` text NOT NULL,
	`principal` integer NOT NULL,
	`interest` integer NOT NULL,
	`penalty` integer DEFAULT 0 NOT NULL,
	`method` text NOT NULL,
	`upi_ref` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`instalment_id`) REFERENCES `instalments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `restructure_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`proposer_id` text NOT NULL,
	`new_months` integer NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`decided_at` integer,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`proposer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `restructure_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`proposal_id` text NOT NULL,
	`user_id` text NOT NULL,
	`choice` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`proposal_id`) REFERENCES `restructure_proposals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rvote_unique` ON `restructure_votes` (`proposal_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `risk_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`score` integer,
	`band` text,
	`factors_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`segment` text NOT NULL,
	`vpa` text NOT NULL,
	`institution` text,
	`kyc_status` text DEFAULT 'none' NOT NULL,
	`vetted` integer DEFAULT false NOT NULL,
	`is_platform_admin` integer DEFAULT false NOT NULL,
	`demo_persona` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_unique` ON `users` (`phone`);--> statement-breakpoint
CREATE TABLE `votes` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`user_id` text NOT NULL,
	`choice` text NOT NULL,
	`comment` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vote_unique` ON `votes` (`loan_id`,`user_id`);