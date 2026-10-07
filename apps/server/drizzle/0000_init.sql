CREATE TABLE `activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`at` text NOT NULL,
	`user_id` text,
	`invoice_id` text,
	`client_id` text,
	`type` text NOT NULL,
	`summary` text NOT NULL,
	`meta` text
);
--> statement-breakpoint
CREATE INDEX `activity_ws_at` ON `activity_log` (`workspace_id`,`at`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`contact_person` text,
	`address_lines` text NOT NULL,
	`email` text,
	`phone` text,
	`tax_ids` text NOT NULL,
	`default_issuer_profile_id` text,
	`default_payment_account_id` text,
	`default_currency` text,
	`default_due_days` integer,
	`notes` text,
	`archived_at` text
);
--> statement-breakpoint
CREATE INDEX `clients_ws` ON `clients` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `invoice_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`invoice_id` text NOT NULL,
	`revision` integer NOT NULL,
	`data` text NOT NULL,
	`total_minor` integer NOT NULL,
	`note` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_revisions_unique` ON `invoice_revisions` (`invoice_id`,`revision`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`number` text NOT NULL,
	`status` text NOT NULL,
	`deleted_at` text,
	`issue_date` text NOT NULL,
	`due_date` text,
	`currency` text NOT NULL,
	`client_id` text NOT NULL,
	`client_name` text NOT NULL,
	`issuer_profile_id` text NOT NULL,
	`issuer_name` text NOT NULL,
	`reference` text,
	`total_minor` integer NOT NULL,
	`paid_at` text,
	`paid_note` text,
	`cancelled_at` text,
	`cancel_reason` text,
	`template_id` text NOT NULL,
	`template_version` integer NOT NULL,
	`paper_size` text NOT NULL,
	`revision` integer NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `invoices_status` ON `invoices` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `invoices_issue_date` ON `invoices` (`workspace_id`,`issue_date`);--> statement-breakpoint
CREATE INDEX `invoices_client` ON `invoices` (`workspace_id`,`client_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_number` ON `invoices` (`workspace_id`,`number`);--> statement-breakpoint
CREATE TABLE `issuer_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`display_name` text NOT NULL,
	`legal_name` text,
	`address_lines` text NOT NULL,
	`email` text,
	`phone` text,
	`website` text,
	`tax_ids` text NOT NULL,
	`logo_file` text,
	`default_payment_account_id` text,
	`is_default` integer NOT NULL,
	`archived_at` text
);
--> statement-breakpoint
CREATE INDEX `issuer_profiles_ws` ON `issuer_profiles` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `number_sequences` (
	`workspace_id` text NOT NULL,
	`period_key` text NOT NULL,
	`last_value` integer NOT NULL,
	PRIMARY KEY(`workspace_id`, `period_key`)
);
--> statement-breakpoint
CREATE TABLE `payment_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`issuer_profile_id` text,
	`label` text NOT NULL,
	`currency` text NOT NULL,
	`kind` text NOT NULL,
	`lines` text NOT NULL,
	`archived_at` text
);
--> statement-breakpoint
CREATE INDEX `payment_accounts_ws` ON `payment_accounts` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`timezone` text NOT NULL,
	`settings` text NOT NULL,
	`created_at` text NOT NULL
);
