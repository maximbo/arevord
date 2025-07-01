CREATE TABLE `articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`published` text,
	`load_time` integer NOT NULL,
	`parsing_time` integer NOT NULL,
	`fetching_status` text NOT NULL,
	`parsing_status` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
