ALTER TABLE `submissions` ADD `groupedSelections` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `groupedScores` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `groupedTotalScore` int;--> statement-breakpoint
ALTER TABLE `submissions` ADD `groupedScoreValid` int DEFAULT 0 NOT NULL;