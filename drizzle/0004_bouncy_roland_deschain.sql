CREATE TABLE `operationEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` varchar(32) NOT NULL,
	`outcome` varchar(16) NOT NULL,
	`detail` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operationEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `operationEvents_lookup_idx` ON `operationEvents` (`kind`,`createdAt`);--> statement-breakpoint
-- Comme en migration 0003 : sur un serveur réglé sur MyISAM (le défaut de
-- WAMP), la table serait créée sans transactions. No-op ailleurs.
ALTER TABLE `operationEvents` ENGINE=InnoDB;