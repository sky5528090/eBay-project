CREATE TABLE `site_settings` (
	`id` int NOT NULL,
	`brandName` varchar(120) NOT NULL DEFAULT '自我探索所',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`)
);
