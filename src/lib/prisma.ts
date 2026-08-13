import path from 'path'
import { PrismaClient } from '@prisma/client'

// Safety net: If nothing on the server (panel env, .env file) passes a
// DATABASE_URL, the app falls back to the built-in SQLite database.
// Detected via the standalone path: the server runs from
// `.next/standalone` there, the database sits one level above in `prisma/`.
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