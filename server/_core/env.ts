export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Sel du hachage des IP. Les IP ne sont jamais stockées en clair : seul leur
  // hash sert au rate limiting. Le sel doit rester secret, sinon le hash est
  // trivialement inversible (l'espace des IPv4 se force brute en quelques minutes).
  ipHashSalt: process.env.IP_HASH_SALT ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFrom: process.env.RESEND_FROM ?? "Dis oui <onboarding@resend.dev>",

  // --- Courriel -------------------------------------------------------------
  // `smtp` dès qu'un hôte est renseigné, sinon `sendmail` si demandé
  // explicitement, sinon Resend, sinon affichage en console.
  mailTransport: process.env.MAIL_TRANSPORT ?? "",
  mailFrom: process.env.MAIL_FROM ?? "Dis oui <no-reply@localhost>",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 465),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPassword: process.env.SMTP_PASSWORD ?? "",
  sendmailPath: process.env.SENDMAIL_PATH ?? "/usr/sbin/sendmail",
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:3000",
  // Mot de passe unique du tableau de bord d'administration. Vide, la console
  // est purement et simplement inaccessible — c'est le comportement voulu tant
  // qu'aucun mot de passe n'a été choisi.
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  // Jeton de la route de purge appelée par le cron. Distinct du mot de passe
  // d'administration : il transite dans une ligne de crontab, donc dans un
  // fichier lisible sur le serveur.
  cronToken: process.env.CRON_TOKEN ?? "",
};
