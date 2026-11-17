CREATE TABLE `admin_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int NOT NULL,
	`actorName` varchar(255),
	`actorEmail` varchar(320),
	`action` varchar(80) NOT NULL,
	`targetType` varchar(80) NOT NULL,
	`targetId` varchar(120),
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_audit_logs_id` PRIMARY KEY(`id`)
);
