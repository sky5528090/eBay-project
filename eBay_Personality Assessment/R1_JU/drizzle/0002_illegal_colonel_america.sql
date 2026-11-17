CREATE TABLE `admin_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`invitedByUserId` int NOT NULL,
	`status` enum('pending','accepted','revoked') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `admin_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_invitations_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `deletion_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`targetEmail` varchar(320) NOT NULL,
	`reason` text,
	`status` enum('pending','completed','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `deletion_requests_id` PRIMARY KEY(`id`)
);
