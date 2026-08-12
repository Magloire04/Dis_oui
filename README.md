# Dis oui

Générateur d'invitations de rendez-vous interactives. Le créateur compose une
invitation en six étapes, partage un lien, et reçoit la réponse par e-mail avec
un fichier calendrier. Aucun compte n'est nécessaire.

---

## Démarrage

Prérequis : Node 20+, pnpm, un serveur MySQL 8.

```bash
pnpm install
cp .env.example .env          # puis renseigner les valeurs
```

Créer les deux bases (la seconde sert aux tests, qui tronquent leurs tables) :

```sql
CREATE DATABASE dis_oui      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE dis_oui_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Puis appliquer les migrations et lancer le serveur :

```bash
pnpm exec drizzle-kit migrate
pnpm dev                      # http://localhost:3000
```

> **MySQL et le moteur de stockage.** Les clés étrangères exigent InnoDB. Si le
> serveur est configuré avec `default_storage_engine=MYISAM` (le défaut de
> WAMP), MySQL ignore *silencieusement* les contraintes déclarées. La migration
> `0003` convertit les tables en InnoDB, ce qui rend l'installation portable ;
> il n'y a donc rien à modifier dans `my.ini`.

### Commandes

| Commande | Rôle |
|---|---|
| `pnpm dev` | serveur de développement (API + client, un seul process) |
| `pnpm check` | vérification TypeScript, tests inclus |
| `pnpm test` | suite Vitest sur la base `_test` |
| `pnpm build` | bundle client dans `dist/public`, serveur dans `dist` |
| `pnpm start` | exécution du build de production |
| `pnpm exec drizzle-kit generate` | génère une migration depuis `drizzle/schema.ts` |

---

## Architecture

Un unique process Express sert l'API et le client : Vite en middleware en
développement, fichiers statiques en production.

```
navigateur ──► /api/trpc ──► Express ──► appRouter ──► invitationsDb ──► MySQL
                                              │
                                              └──► emailService ──► Resend
```

| Chemin | Contenu |
|---|---|
| `client/src/pages/` | les six pages : accueil, éditeur, funnel destinataire, suivi, mentions légales, confidentialité |
| `client/src/lib/themes.ts` | les six thèmes visuels et leurs jetons de style |
| `server/invitationsRouter.ts` | les cinq procédures tRPC |
| `server/invitationsDb.ts` | accès données, rate limiting, purge |
| `server/emailService.ts` | notification du créateur via Resend |
| `server/purge.ts` | suppression périodique des données expirées |
| `server/socialMeta.ts` | aperçus de partage neutres sur les liens privés |
| `shared/invitationConfig.ts` | schéma Zod partagé client/serveur |
| `shared/ics.ts` | génération iCalendar (RFC 5545) |
| `server/_core/`, `shared/_core/` | socle du gabarit Manus (OAuth, stockage, LLM…), largement inutilisé ici |

### Points de conception à connaître

- **Les créneaux portent une date réelle.** `selectedDates` est un tableau de
  `{ id, label, startsAt, durationMin }` : le `label` garde la formulation
  libre affichée au destinataire, `startsAt` rend le fichier `.ics` possible.
  Les invitations créées avant cette évolution ne stockent que des chaînes ;
  `normalizeDateSlots()` les lit sans erreur, mais sans date exploitable aucun
  fichier calendrier n'est proposé.
- **Le même générateur `.ics` sert au client et au serveur** (`shared/ics.ts`),
  pour que le fichier téléchargé et celui joint à l'e-mail soient identiques.
- **Sans `RESEND_API_KEY`, l'e-mail est affiché en console.** Le développement
  local ne demande aucun compte. Un échec d'envoi ne fait jamais échouer la
  réponse du destinataire, qui est déjà enregistrée.
- **Les classes Tailwind ne doivent jamais être composées à l'exécution.**
  Tailwind analyse le code source : une classe formée par
  `` `${theme.accentColor}/15` `` ou `` `scale-${n}` `` n'existe pas dans le CSS
  généré. Les jetons de `ThemeConfig` sont donc écrits en toutes lettres.
- **Les données personnelles sont purgées automatiquement.** À l'échéance
  choisie (7, 30 ou 90 jours), l'invitation et sa réponse sont supprimées ;
  la clé étrangère `ON DELETE CASCADE` garantit qu'aucune réponse ne survit.

---

## Reste à faire avant une mise en ligne publique

- [ ] Renseigner les mentions légales (`client/src/pages/MentionsLegales.tsx`) :
      identité de l'éditeur et de l'hébergeur, obligatoires et signalées en
      jaune dans la page.
- [ ] Créer un compte Resend, vérifier un domaine d'envoi, renseigner
      `RESEND_API_KEY` et `RESEND_FROM`.
- [ ] Renseigner `PUBLIC_BASE_URL` avec le domaine réel (il alimente les liens
      des e-mails).
- [ ] Choisir l'hébergement et provisionner une base MySQL de production.
- [ ] Générer des secrets `JWT_SECRET` et `IP_HASH_SALT` distincts de ceux du
      développement. `IP_HASH_SALT` est obligatoire en production : sans sel,
      un hachage d'IPv4 se force brute en quelques minutes.
- [ ] Le bundle client dépasse 500 Ko : envisager un découpage par route si le
      temps de chargement pose problème.
