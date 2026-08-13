import path from 'path'
import { PrismaClient } from '@prisma/client'

// Absicherung: Falls auf dem Server nichts (Panel-Env, .env-Datei) eine
// DATABASE_URL durchreicht, fällt die App auf die eingebaute SQLite-Datenbank
// zurück. Erkennung anhand des Standalone-pfads: Der Server läuft dort aus
// `.next/standalone` heraus, die Datenbank liegt eine Ebene darüber in `prisma/`.
if (!process.env.DATABASE_URL) {
  const cwd = process.cwd().replace(/[\\/]+$/, '')
  const isStandalone = path.basename(cwd) === 'standalone'
  const prismaDir = isStandalone ? path.resolve(cwd, '..', 'prisma') : path.resolve(cwd, 'prisma')
  process.env.DATABASE_URL = `file:${path.join(prismaDir, 'linyashare.db').replace(/\\/g, '/')}`
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma