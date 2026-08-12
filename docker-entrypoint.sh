#!/bin/sh
# ──────────────────────────────────────────────────────────
# LinyaShare - Docker entrypoint
# Applies the database schema ("prisma db push") on every start
# and launches the Next.js standalone server.
# ──────────────────────────────────────────────────────────
set -e

echo "[entrypoint] LinyaShare starting..."

# Database provider + connection string.
# Mirrors the Pterodactyl egg behaviour:
#   - No DATABASE_URL set  → built-in SQLite at /app/prisma/linyashare.db
#   - DATABASE_PROVIDER is only read for choosing the schema file.
DATABASE_PROVIDER="${DATABASE_PROVIDER:-sqlite}"
if [ -z "${DATABASE_URL:-}" ]; then
  DATABASE_URL="file:/app/prisma/linyashare.db"
  DATABASE_PROVIDER="sqlite"
fi
export DATABASE_PROVIDER DATABASE_URL

# Always use the provider-specific schema file (never schema.prisma),
# so this also works when ./prisma is bind-mounted from the host.
case "$DATABASE_PROVIDER" in
  mysql)
    SCHEMA_FILE="/app/prisma/schema.mysql.prisma"
    ;;
  postgres)
    SCHEMA_FILE="/app/prisma/schema.postgres.prisma"
    ;;
  *)
    SCHEMA_FILE="/app/prisma/schema.prisma"
    ;;
esac

echo "[entrypoint] Provider: ${DATABASE_PROVIDER}"
echo "[entrypoint] Schema:   ${SCHEMA_FILE}"

# Creates/updates tables. Safe to run on every start (idempotent).
echo "[entrypoint] Applying database schema..."
npx prisma db push --schema="$SCHEMA_FILE" --skip-generate

echo "[entrypoint] Starting server..."
exec node server.js