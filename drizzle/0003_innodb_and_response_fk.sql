-- Migration écrite à la main : drizzle-kit ne pilote pas le moteur de stockage.
--
-- La migration 0002 a déclaré la clé étrangère `responses -> invitations`, mais
-- MySQL l'a silencieusement ignorée : les tables étaient en MyISAM, un moteur
-- sans support des clés étrangères (`SHOW CREATE TABLE` n'affichait qu'un KEY).
-- WAMP livre `default_storage_engine=MYISAM`, d'où le problème en local.
--
-- Sans cette contrainte, la purge RGPD laisserait des réponses orphelines.
-- MyISAM n'offre par ailleurs ni transactions ni verrouillage par ligne.
--
-- Les ALTER sont des no-op sur un serveur déjà en InnoDB.

ALTER TABLE `invitations` ENGINE=InnoDB;--> statement-breakpoint
ALTER TABLE `responses` ENGINE=InnoDB;--> statement-breakpoint
ALTER TABLE `rateLimits` ENGINE=InnoDB;--> statement-breakpoint
ALTER TABLE `users` ENGINE=InnoDB;--> statement-breakpoint

-- Ajout conditionnel : sur un serveur InnoDB, la 0002 a déjà créé la contrainte
-- et MySQL ne connaît pas `ADD CONSTRAINT IF NOT EXISTS`.
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND CONSTRAINT_NAME = 'responses_invitationId_invitations_id_fk'
);--> statement-breakpoint
SET @add_fk := IF(
  @fk_exists = 0,
  'ALTER TABLE `responses` ADD CONSTRAINT `responses_invitationId_invitations_id_fk` FOREIGN KEY (`invitationId`) REFERENCES `invitations`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
  'DO 0'
);--> statement-breakpoint
PREPARE add_fk_stmt FROM @add_fk;--> statement-breakpoint
EXECUTE add_fk_stmt;--> statement-breakpoint
DEALLOCATE PREPARE add_fk_stmt;
