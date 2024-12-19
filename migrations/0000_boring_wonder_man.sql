CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`domains` text,
	`logo` text
);
--> statement-breakpoint