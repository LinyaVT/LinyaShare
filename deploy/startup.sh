#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# LinyaShare – Server Startup (Pterodactyl / FeatherPanel Egg)
# Called by the launcher `deploy/startup-launcher.sh` from /home/container.
# READS ALL VALUES FROM THE ENVIRONMENT (egg variables). No panel-template
# substitution here – immune against panel substitution bugs
# (e.g. empty/missing `${DATABASE_URL}` values).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

cd /home/container || exit 1
mkdir -p prisma

# ── Reset schema to the repo state ───────────────────────────────────────────
# (The admin may have changed prisma/schema.prisma locally – the provider copy
#  below overwrites it anyway. We start cleanly from the committed state.)
git checkout HEAD -- prisma/schema.prisma 2>/dev/null || true

# ── Auto-Update ────────────────────────────────────────────────────────────────
if [ "${AUTO_UPDATE:-false}" = "true" ]; then
  echo "[startup] Auto-update active -> pull from GitHub"
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

# ── Reinstall dependencies (self-healing) ──────────────────────────────────────
# If node_modules is missing (fresh container, broken state), npm install
# runs. This restores the PINNED versions from package-lock.json
# (among them prisma 5.22.0) and prevents `npx prisma` from accidentally
# loading prisma 7.x. The `install-scripts approve` line unlocks the
# postinstall scripts blocked by npm 11 (prisma/sharp) and is harmless on older npm.
if [ ! -d node_modules ] || [ ! -x node_modules/.bin/prisma ]; then
  echo "[startup] node_modules missing -> installing dependencies"
  npm install-scripts approve prisma @prisma/client @prisma/engines sharp 2>/dev/null || true
  npm install
fi

# ── Environment defaults (if egg variables are empty) ──────────────────────────
export PORT="${PORT:-3000}"
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://${SERVER_IP:-localhost}:${PORT}}"
export NEXTAUTH_URL="${NEXTAUTH_URL:-$NEXT_PUBLIC_APP_URL}"
export AUTH_TRUST_HOST="${AUTH_TRUST_HOST:-true}"
export DATABASE_PROVIDER="${DATABASE_PROVIDER:-sqlite}"

# ── Secure the database URL ────────────────────────────────────────────────────
# sqlite strictly needs the `file:` protocol. If the URL is missing entirely (or
# is without protocol for sqlite), it falls back to the built-in SQLite database.
if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="file:/home/container/prisma/linyashare.db"
  export DATABASE_PROVIDER="sqlite"
elif [ "${DATABASE_PROVIDER:-sqlite}" = "sqlite" ] && [ "${DATABASE_URL#file:}" = "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/home/container/prisma/linyashare.db"
fi

# Store as .env for the runtime – PrismaClient loads .env automatically
# (important if the panel does not pass the env variable to `node server.js`).
echo "DATABASE_URL=$DATABASE_URL" > .env
echo "DATABASE_PROVIDER=$DATABASE_PROVIDER" >> .env

# ── Upload/import directories ────────────────────────────────────────────────────
export UPLOAD_DIR="${UPLOAD_DIR:-/home/container/data/uploads}"
export IMPORT_DIR="${IMPORT_DIR:-/home/container/data/import}"
export GLOBAL_UPLOAD_DIR="${GLOBAL_UPLOAD_DIR:-/home/container/data/uploads/global}"
mkdir -p "$UPLOAD_DIR" "$IMPORT_DIR"

# ── Select the provider schema (only the file, not the env) ─────────────────────
case "$DATABASE_PROVIDER" in
  postgres) cp -f prisma/schema.postgres.prisma prisma/schema.prisma ;;
  mysql)    cp -f prisma/schema.mysql.prisma    prisma/schema.prisma ;;
esac

# ── Generate Prisma client + build the app ───────────────────────────────────────
./node_modules/.bin/prisma generate
npm run build

# ── Complete the standalone output ───────────────────────────────────────────────
mkdir -p .next/standalone/.next/static
cp -rf .next/static/* .next/standalone/.next/static/ 2>/dev/null || true
if [ -d public ]; then
  cp -rf public/* .next/standalone/public/ 2>/dev/null || true
fi
# Copy .env into the standalone directory (cwd of the server = .next/standalone)
cp -f .env .next/standalone/.env 2>/dev/null || true

# ── Apply the database schema (idempotent) ───────────────────────────────────────
./node_modules/.bin/prisma db push --schema=prisma/schema.prisma

# ── Fonts (optional – lazy download as fallback) ──────────────────────────────────
{ npm run fonts:download || echo "[fonts] Pre-download failed, lazy download will handle it"; }

# ── Copy the Prisma client (engine) into the standalone ───────────────────────────
cp -rf node_modules/.prisma .next/standalone/node_modules/ 2>/dev/null || true

# ── Init wrapper (PID 1) ───────────────────────────────────────────────────────────
# entry.js sits in front of the Node server as PID 1 and catches SIGINT/SIGTERM AND
# stdin-"^C"/0x03 stops, so FeatherPanel/Pterodactyl always stops the container
# cleanly (exit 0) instead of killing it. (See start/stop comment in
# startup-launcher.sh.)
cp -f deploy/entry.js .next/standalone/entry.js

# ── Start the server ────────────────────────────────────────────────────────────────
# IMPORTANT: `node entry.js` MUST become PID 1. Therefore export first and THEN
# `exec node entry.js` – NOT `exec env X=1 node entry.js`, because env forks node
# as a child and becomes PID 1 itself. Stop signals would then reach env (not our
# wrapper) and the container would stay hanging in "Stopping".
export PORT DATABASE_URL
export HOSTNAME=0.0.0.0
cd .next/standalone
exec node entry.js
