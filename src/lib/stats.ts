import { prisma } from "@/lib/prisma"

export type StatEventType = "DOWNLOAD" | "VIEW" | "UPLOAD" | "REGISTER"

export interface StatEventInput {
  fileId?: string
  userId?: string
  size?: number
}

/**
 * Logs a statistics event (fire-and-forget).
 * Errors are deliberately ignored so the hot path
 * (download / upload / view) is never blocked by logging.
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