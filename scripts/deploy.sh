#!/usr/bin/env bash
#
# Déploiement de Dis oui sur l'hébergement mutualisé cPanel.
#
# Le déploiement enchaîne une dizaine d'opérations réparties entre la machine
# locale et le serveur, et trois d'entre elles cassent silencieusement quand on
# les oublie : sans `rm -rf dist` d'anciens assets survivent, sans activation
# de l'environnement Node la commande `node` n'existe pas, et rien n'empêche
# de publier du code dont les tests échouent. Ce script refuse plutôt que de
# laisser passer.
#
# Usage :
#   ./scripts/deploy.sh                  déploiement normal depuis main
#   ./scripts/deploy.sh --sans-tests     saute check et test (urgence seulement)
#   ./scripts/deploy.sh --branche-libre  autorise une branche autre que main
#
# Configuration : voir .env.deploy.example

set -euo pipefail

racine="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$racine"

# --- Sortie ------------------------------------------------------------------

if [ -t 1 ]; then
  gras=$'\033[1m'; rouge=$'\033[31m'; vert=$'\033[32m'; jaune=$'\033[33m'; fin=$'\033[0m'
else
  gras=""; rouge=""; vert=""; jaune=""; fin=""
fi

etape()   { printf '\n%s▸ %s%s\n' "$gras" "$1" "$fin"; }
ok()      { printf '  %s✓%s %s\n' "$vert" "$fin" "$1"; }
alerte()  { printf '  %s!%s %s\n' "$jaune" "$fin" "$1"; }
abandon() { printf '\n%s✗ %s%s\n\n' "$rouge" "$1" "$fin" >&2; exit 1; }

# --- Options -----------------------------------------------------------------

lancer_tests=1
branche_libre=0
for argument in "$@"; do
  case "$argument" in
    --sans-tests)    lancer_tests=0 ;;
    --branche-libre) branche_libre=1 ;;
    -h|--help)       sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)               abandon "Option inconnue : $argument" ;;
  esac
done

# --- Configuration -----------------------------------------------------------

# Les coordonnées du serveur ne sont pas versionnées : ce dépôt est public, et
# publier l'utilisateur SSH, l'adresse et le port offrirait de la
# reconnaissance gratuite à un attaquant.
[ -f .env.deploy ] || abandon "Fichier .env.deploy absent. Copiez .env.deploy.example et renseignez-le."
# shellcheck disable=SC1091
set -a; . ./.env.deploy; set +a

for variable in SSH_HOTE SSH_UTILISATEUR SSH_PORT SSH_CLE APP_DISTANTE URL_PUBLIQUE; do
  [ -n "${!variable:-}" ] || abandon "$variable n'est pas défini dans .env.deploy"
done

cible="${SSH_UTILISATEUR}@${SSH_HOTE}"
distant() { ssh -p "$SSH_PORT" -i "$SSH_CLE" -o BatchMode=yes "$cible" "$@"; }

# pnpm n'est pas toujours dans le PATH : installé par corepack, il n'expose pas
# de binaire propre sous Git Bash. On retombe sur `corepack pnpm`, qui
# fonctionne dès que Node est présent.
if command -v pnpm >/dev/null 2>&1; then
  paquets() { pnpm "$@"; }
elif command -v corepack >/dev/null 2>&1; then
  paquets() { corepack pnpm "$@"; }
else
  abandon "Ni pnpm ni corepack ne sont disponibles."
fi

# --- Garde-fous --------------------------------------------------------------

etape "Vérifications préalables"

branche="$(git branch --show-current)"
if [ "$branche" != "main" ] && [ "$branche_libre" -eq 0 ]; then
  abandon "Branche courante « $branche ». La production se déploie depuis main (--branche-libre pour passer outre)."
fi
ok "branche : $branche"

if [ -n "$(git status --porcelain)" ]; then
  abandon "Modifications non validées. Committez ou remisez avant de déployer."
fi
ok "arbre de travail propre"

# Un déploiement depuis une branche en retard republierait du code ancien.
git fetch origin --quiet
if [ "$branche" = "main" ]; then
  retard="$(git rev-list --count HEAD..origin/main)"
  [ "$retard" -eq 0 ] || abandon "$retard commit(s) en retard sur origin/main. Faites un git pull."
  ok "à jour avec origin/main"
fi

distant 'echo ok' >/dev/null 2>&1 || abandon "Connexion SSH impossible vers $cible."
ok "connexion SSH établie"

# --- Contrôles qualité -------------------------------------------------------

if [ "$lancer_tests" -eq 1 ]; then
  etape "Contrôles qualité"
  paquets check >/dev/null || abandon "pnpm check a échoué."
  ok "typage TypeScript"
  paquets test >/dev/null 2>&1 || abandon "pnpm test a échoué."
  ok "tests"
else
  alerte "Tests sautés (--sans-tests)"
fi

# --- Construction ------------------------------------------------------------

etape "Construction"
# Vite et esbuild écrivent leur rapport sur la sortie d'erreur : on le met de
# côté pour ne l'afficher qu'en cas d'échec.
journal_build="$(mktemp)"
paquets build >"$journal_build" 2>&1 || { cat "$journal_build" >&2; rm -f "$journal_build"; abandon "La construction a échoué."; }
rm -f "$journal_build"
[ -f dist/index.js ] || abandon "dist/index.js est absent après la construction."
[ -f dist/package.json ] || abandon "dist/package.json est absent : scripts/package-production.mjs n'a pas tourné."
ok "$(node -e "console.log(Math.round(require('fs').statSync('dist/index.js').size/1024)+' Ko')") pour le serveur, client dans dist/public"

# --- Paquet ------------------------------------------------------------------

etape "Fabrication du paquet"
paquet="$(mktemp -d)"
trap 'rm -rf "$paquet"' EXIT

cp -r dist drizzle scripts "$paquet/"
# Le package.json réduit devient celui de l'application : celui du dépôt liste
# tout le nécessaire du client, inutile sur le serveur.
cp dist/package.json "$paquet/package.json"
rm -f "$paquet/dist/package.json" "$paquet/drizzle/schema.ts" "$paquet/drizzle/relations.ts"
rm -f "$paquet"/drizzle/meta/*_snapshot.json

archive="$paquet/../disoui-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$archive" -C "$paquet" .
ok "$(du -h "$archive" | cut -f1) · $(node -e "console.log(require('child_process').execSync('git rev-parse --short HEAD').toString().trim())")"

# --- Téléversement -----------------------------------------------------------

etape "Téléversement"
scp -q -P "$SSH_PORT" -i "$SSH_CLE" -o BatchMode=yes "$archive" "$cible:$APP_DISTANTE/paquet.tar.gz"
rm -f "$archive"
ok "envoyé vers $APP_DISTANTE"

# --- Installation ------------------------------------------------------------

etape "Installation sur le serveur"
distant "bash -s" <<DISTANT || abandon "L'installation a échoué. Consultez $APP_DISTANTE/stderr.log"
set -euo pipefail
cd "$APP_DISTANTE"

# Remplacement complet : un asset supprimé doit disparaître, or les noms de
# fichiers changent à chaque construction.
rm -rf dist
tar -xzf paquet.tar.gz && rm -f paquet.tar.gz

# Sans cette activation, « node » n'existe pas dans le PATH de cet hébergement.
# `set +u` le temps du source : le script d'activation fourni par CloudLinux
# lit CL_VIRTUAL_ENV sans l'avoir définie, ce qui avorte sous `set -u`.
set +u
source "$NODEENV_DISTANT/bin/activate"
set -u

npm install --omit=dev --no-audit --no-fund >/dev/null
node scripts/migrate.mjs
DISTANT
ok "dépendances et migrations à jour"

etape "Redémarrage"
distant "cloudlinux-selector restart --json --interpreter nodejs --app-root '$APP_ROOT_RELATIF'" >/dev/null
ok "application redémarrée"

# --- Vérification ------------------------------------------------------------

etape "Vérification"
sleep 8

for chemin in "/" "/editor" "/admin"; do
  code="$(curl -s -o /dev/null -w '%{http_code}' -m 30 "$URL_PUBLIQUE$chemin" || echo 000)"
  [ "$code" = "200" ] || abandon "$chemin répond $code. Consultez $APP_DISTANTE/stderr.log"
  printf '  %s✓%s %-10s %s\n' "$vert" "$fin" "$chemin" "$code"
done

stats="$(curl -s -m 30 "$URL_PUBLIQUE/api/trpc/invitations.stats" || true)"
case "$stats" in
  *totalCreated*) ok "API opérationnelle" ;;
  *)              abandon "L'API ne répond pas correctement." ;;
esac

# Le transport d'e-mail est la dépendance la plus fragile : la console le
# rapporte, autant le vérifier à chaque publication.
if [ -n "${ADMIN_MOT_DE_PASSE:-}" ]; then
  biscuits="$(mktemp)"
  curl -s -c "$biscuits" -o /dev/null -X POST "$URL_PUBLIQUE/api/trpc/admin.connexion" \
    -H "Content-Type: application/json" \
    -d "{\"json\":{\"password\":\"$ADMIN_MOT_DE_PASSE\"}}" || true
  sante="$(curl -s -b "$biscuits" -m 30 "$URL_PUBLIQUE/api/trpc/admin.sante" || true)"
  rm -f "$biscuits"
  transport="$(printf '%s' "$sante" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{
      try { const s=JSON.parse(d).result.data.json;
            console.log(s.courriel.transport + (s.envoiReel ? ' (actif)' : ' (INACTIF)')); }
      catch { console.log('indéterminé'); }
    });" 2>/dev/null || echo indéterminé)"
  case "$transport" in
    *INACTIF*|indéterminé) alerte "transport d'e-mail : $transport" ;;
    *)                     ok "transport d'e-mail : $transport" ;;
  esac
fi

printf '\n%s%s déployé sur %s%s\n\n' "$gras" "$(git rev-parse --short HEAD)" "$URL_PUBLIQUE" "$fin"
