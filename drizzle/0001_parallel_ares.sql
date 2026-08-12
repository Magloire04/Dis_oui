CREATE TABLE `invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(12) NOT NULL,
	`creatorEmail` text NOT NULL,
	`creatorToken` varchar(64) NOT NULL,
	`config` json NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`allowMultiple` boolean NOT NULL DEFAULT false,
	`openedAt` timestamp,
	`ipHash` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `invitations_creatorToken_unique` UNIQUE(`creatorToken`)
);
--> statement-breakpoint
CREATE TABLE `rateLimits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ipHash` varchar(64) NOT NULL,
	`actionType` varchar(32) NOT NULL,
	`timestamp` timestamp NOT NULL,
	CONSTRAINT `rateLimits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invitationId` int NOT NULL,
	`answer` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `responses_id` PRIMARY KEY(`id`)
);
