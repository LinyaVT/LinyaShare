// ──────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────

export type FileStatus = "ACTIVE" | "IMPORT" | "ORPHANED"

export type MediaCategory = "video" | "audio" | "image" | null

export interface FileWithEmbed {
  id: string
  shareId: string
  name: string
  originalName: string
  type: string
  size: number
  password: string | null
  plainPassword: string | null
  userId: string | null
  downloads: number
  status: FileStatus
  createdAt: Date
  embedUrl?: string | null
  isMediaEmbed?: boolean | null
}

export interface FileInfo {
  id: string
  originalName: string
  type: string
  size: number
  shareId: string
  downloads: number
  password: string | null
  plainPassword: string | null
  createdAt: Date
  embedUrl: string | null
  isMediaEmbed: boolean
  hasPassword: boolean
  shareUrl: string
  user?: {
    name: string
  }
}

export interface UnclaimedFile {
  id: string | null
  name: string
  originalName: string
  size: number
  type: string
  status: FileStatus
  createdAt: Date
}

export interface UnclaimedFilesResult {
  claimed: Array<Omit<FileWithEmbed, 'plainPassword'> & { password?: string }>
  orphaned: UnclaimedFile[]
}

// ──────────────────────────────────────────────────────────
// EXTENDED SESSION TYPES (bypass NextAuth type limitation)
// ──────────────────────────────────────────────────────────

export interface ExtendedUser {
  id: string
  email: string
  name: string
  role: "USER" | "ADMIN"
}

export interface ExtendedSession {
  user: ExtendedUser
  expires: string
}