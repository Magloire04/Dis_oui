# Project TODO — Dis oui

- [x] Initialiser le projet et la structure de base
- [x] Mettre à jour le schéma de base de données Drizzle (`drizzle/schema.ts`) pour les tables `invitations`, `responses` et `rate_limits`
- [x] Appliquer les migrations de base de données via `webdev_execute_sql`
- [x] Développer les helpers de base de données et les procédures tRPC (`server/routers.ts` ou routeur dédié) pour la création, la récupération, la réponse, et le suivi
- [x] Implémenter le système de sécurité : hachage IP, rate limiting (3/h, 10/jour), filtrage de contenu et purge RGPD automatique
- [x] Développer le service d'e-mail (Resend / notification) avec génération du fichier `.ics` de calendrier
- [x] Développer la Landing Page (Hero, Comment ça marche, Galerie des 6 thèmes avec prévisualisation interactive, FAQ, Preuve sociale, Pied de page)
- [x] Développer l'Éditeur en 6 étapes (Identités, Question & bouton fuyant, Créneaux, Menu & options, Direction artistique & 6 thèmes animés, Livraison) avec sauvegarde `localStorage` et aperçu live en temps réel
- [x] Développer l'écran de succès et la page de partage / QR code
- [x] Développer le Funnel Destinataire immersif en 6 écrans (Seuil enveloppe, Question avec bouton fuyant tactile/clavier accessible, Réaction, Date & Heure, Menu, Billet final avec export `.ics` et téléchargement d'image)
- [x] Développer la page de suivi privée du créateur (`/track/[token]`)
- [x] Écrire les tests unitaires (Vitest) pour valider les routes et la logique métier
