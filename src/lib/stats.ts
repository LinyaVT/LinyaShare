import { prisma } from "@/lib/prisma"

export type StatEventType = "DOWNLOAD" | "VIEW" | "UPLOAD" | "REGISTER"

export interface StatEventInput {
  fileId?: string
  userId?: string
  size?: number
}

/**
 * Loggt ein Statistik-Event (fire-and-forget).
 * Fehler werden bewusst ignoriert, damit der Hot-Path
 * (Download / Upload / View) nie durch das Logging blockiert wird.
 */
export function logStatEvent(type: StatEventType, input: StatEventInput = {}) {
  prisma.statEvent
    .create({
      data: {
        type,
        fileId: input.fileId || null,
        userId: input.userId || null,
        size: input.size !== undefined ? input.size : null,
      },
    })
    .catch(() => {})
}