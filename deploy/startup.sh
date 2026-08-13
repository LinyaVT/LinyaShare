#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# LinyaShare – Server Startup (Pterodactyl / FeatherPanel Egg)
# Aufgerufen vom Launcher `deploy/startup-launcher.sh` aus /home/container.
# LIEST ALLE WERTE AUS DER UMGEBUNG (Egg-Variablen). Keine Panel-Template-
# Substitution hier – dadurch immun gegen Panel-Substitutions-Bugs
# (z.B. leere/gefehlte `${DATABASE_URL}`-Werte).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

cd /home/container || exit 1
mkdir -p prisma

# ── Schema auf Repo-Stand zurücksetzen ────────────────────────────────────────
# (Der Admin kann prisma/schema.prisma lokal geändert haben – Provider-Copy unten
#  überschreibt es ohnehin. Wir starten sauber vom committed Stand.)
git checkout HEAD -- prisma/schema.prisma 2>/dev/null || true

# ── Auto-Update ────────────────────────────────────────────────────────────────
if [ "${AUTO_UPDATE:-false}" = "true" ]; then
  echo "[startup] Auto-Update aktiv -> pull von GitHub"
  git config --global --replace-all user.email pterodactyl@localhost 2>/dev/null || true
  git config --global --replace-all user.name  pterodactyl          2>/dev/null || true
  git fetch origin
  TARGET_BRANCH="${GIT_BRANCH:-main}"
  if [ "$(git rev-parse --abbrev-ref HEAD)" != "$TARGET_BRANCH" ]; then
    git checkout "$TARGET_BRANCH"
  fi
  git pull origin "$TARGET_BRANCH"
  if git diff --name-only HEAD~1 | grep -q package.json; then
    npm install
  fi
fi

# ── Abhängigkeiten nachinstallieren (Selbstheilung) ────────────────────────────
# Wenn node_modules fehlt (frischer Container, kaputter Zustand), wird npm install
# ausgeführt. Das stellt die GEHINNTEN Versionen aus package-lock.json wieder her
# (u.a. prisma 5.22.0) und verhindert, dass `npx prisma` versehentlich prisma 7.x
# nachlädt. Die `install-scripts approve`-Zeile entsperrt die von npm 11 blockierten
# postinstall-Skripte (prisma/sharp) und ist auf älterem npm harmlos.
if [ ! -d node_modules ] || [ ! -x node_modules/.bin/prisma ]; then
  echo "[startup] node_modules fehlt -> installiere Abhängigkeiten"
  npm install-scripts approve prisma @prisma/client @prisma/engines sharp 2>/dev/null || true
  npm install
fi

# ── Umgebungs-Defaults (falls Egg-Variablen leer) ───────────────────────────────
export PORT="${PORT:-3000}"
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://${SERVER_IP:-localhost}:${PORT}}"
export NEXTAUTH_URL="${NEXTAUTH_URL:-$NEXT_PUBLIC_APP_URL}"
export AUTH_TRUST_HOST="${AUTH_TRUST_HOST:-true}"
export DATABASE_PROVIDER="${DATABASE_PROVIDER:-sqlite}"

# ── Datenbank-URL absichern ─────────────────────────────────────────────────────
# sqlite braucht zwingend das `file:`-Protokoll. Fehlt die URL ganz (oder ist sie
# bei sqlite ohne Protokoll), fällt sie auf die eingebaute SQLite-Datenbank zurück.
if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="file:/home/container/prisma/linyashare.db"
  export DATABASE_PROVIDER="sqlite"
elif [ "${DATABASE_PROVIDER:-sqlite}" = "sqlite" ] && [ "${DATABASE_URL#file:}" = "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/home/container/prisma/linyashare.db"
fi

# Für die Runtime als .env ablegen – PrismaClient lädt .env automatisch
# (wichtig, falls der Panel die Env-Variable bei `node server.js` nicht durchreicht).
echo "DATABASE_URL=$DATABASE_URL" > .env
echo "DATABASE_PROVIDER=$DATABASE_PROVIDER" >> .env

# ── Upload-/Import-Verzeichnisse ─────────────────────────────────────────────────
export UPLOAD_DIR="${UPLOAD_DIR:-/home/container/data/uploads}"
export IMPORT_DIR="${IMPORT_DIR:-/home/container/data/import}"
export GLOBAL_UPLOAD_DIR="${GLOBAL_UPLOAD_DIR:-/home/container/data/uploads/global}"
mkdir -p "$UPLOAD_DIR" "$IMPORT_DIR"

# ── Provider-Schema auswählen (nur die Datei, nicht die Env) ─────────────────────
case "$DATABASE_PROVIDER" in
  postgres) cp -f prisma/schema.postgres.prisma prisma/schema.prisma ;;
  mysql)    cp -f prisma/schema.mysql.prisma    prisma/schema.prisma ;;
esac

# ── Prisma Client generieren + App bauen ─────────────────────────────────────────
./node_modules/.bin/prisma generate
npm run build

# ── Standalone-Output vervollständigen ───────────────────────────────────────────
mkdir -p .next/standalone/.next/static
cp -rf .next/static/* .next/standalone/.next/static/ 2>/dev/null || true
if [ -d public ]; then
  cp -rf public/* .next/standalone/public/ 2>/dev/null || true
fi
# .env mit in das Standalone-Verzeichnis (cwd des Servers = .next/standalone)
cp -f .env .next/standalone/.env 2>/dev/null || true

# ── Datenbank-Schema anwenden (idempotent) ───────────────────────────────────────
./node_modules/.bin/prisma db push --schema=prisma/schema.prisma

# ── Fonts (optional – Lazy-Download als Fallback) ────────────────────────────────
{ npm run fonts:download || echo "[fonts] Vorab-Download fehlgeschlagen, Lazy-Download uebernimmt"; }

# ── Prisma-Client (Engine) ins Standalone kopieren ───────────────────────────────
cp -rf node_modules/.prisma .next/standalone/node_modules/ 2>/dev/null || true

# ── Server starten ────────────────────────────────────────────────────────────────
cd .next/standalone
exec env PORT="$PORT" HOSTNAME=0.0.0.0 DATABASE_URL="$DATABASE_URL" node server.js
