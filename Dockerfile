# ──────────────────────────────────────────────────────────
# LinyaShare - Production Dockerfile
# Based on Next.js standalone output
# ──────────────────────────────────────────────────────────

# --- Stage 1: Dependencies & Build ---
FROM node:22-alpine AS builder

# Database provider - selects the Prisma schema + client engine.
#   sqlite (default) | mysql | postgres
# Must match the runtime DATABASE_PROVIDER (see docker-compose.yml).
ARG DATABASE_PROVIDER=sqlite

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (dev + prod)
RUN npm ci

# Copy source code
COPY . .

# Select the Prisma schema matching the database provider
RUN if [ "$DATABASE_PROVIDER" != "sqlite" ]; then \
      cp -f "prisma/schema.${DATABASE_PROVIDER}.prisma" prisma/schema.prisma; \
    fi

# Generate Prisma client
RUN npx prisma generate

# Build Next.js standalone output
RUN npm run build

# --- Stage 2: Production Runtime ---
FROM node:22-alpine AS runner

WORKDIR /app

# Add needed system packages
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
# Full node_modules (includes the Prisma CLI + engines, required for the
# runtime "prisma db push" step). The Next.js standalone bundle keeps
# working alongside it.
COPY --from=builder /app/node_modules ./node_modules

# Entrypoint (applies DB schema, then starts the server)
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create data directories
RUN mkdir -p /app/data/uploads /app/data/import && \
    chown -R nextjs:nodejs /app/data /app/prisma /app/.next

# Switch to non-root user
USER nextjs

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0


# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/setup || exit 1

# Start server (via entrypoint so the DB schema is applied first)
ENTRYPOINT ["/app/docker-entrypoint.sh"]