ALTER TABLE `site_settings` ADD `brandPhotoUrl` text;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `brandPhotoKey` text;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `brandPhotoPositionX` int DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `brandPhotoPositionY` int DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `brandPhotoScale` int DEFAULT 100 NOT NULL;