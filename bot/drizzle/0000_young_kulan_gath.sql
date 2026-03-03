CREATE TABLE `polls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`poll_message_id` text NOT NULL,
	`companion_message_id` text,
	`channel_id` text NOT NULL,
	`group` text NOT NULL,
	`game` text,
	`slots` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `polls_poll_message_id_unique` ON `polls` (`poll_message_id`);