// ──────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ──────────────────────────────────────────────────────────

/**
 * Format bytes to human-readable size (Bytes, KB, MB, GB)
 */
export function formatSize(bytes: number): string {
  const sizes = ["Bytes", "KB", "MB", "GB"]
  if (bytes === 0) return "0 Byte"
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

/**
 * Format date consistently
 */
export function formatDate(date: string | Date, locale = "en-US"): string {
  return new Date(date).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Format upload speed
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond <= 0) return "0 B/s"
  const mbps = bytesPerSecond / (1024 * 1024)
  if (mbps >= 1) return `${mbps.toFixed(1)} MB/s`
  const kbps = bytesPerSecond / 1024
  if (kbps >= 1) return `${kbps.toFixed(1)} KB/s`
  return `${bytesPerSecond.toFixed(0)} B/s`
}

/**
 * Format seconds to human-readable time
 */
export function formatTime(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return "—"
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

/**
 * Extract file extension from filename
 */
export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

// ──────────────────────────────────────────────────────────
// FILE TYPE DETECTION
// ──────────────────────────────────────────────────────────

import { VIDEO_EXTENSIONS, AUDIO_EXTENSIONS, IMAGE_EXTENSIONS, ARCHIVE_EXTENSIONS } from "./constants"

export type FileTypeCategory = "video" | "audio" | "image" | "document" | "archive" | "other"

export interface FileTypeInfo {
  category: FileTypeCategory
  label: string
  color: string
  bgClass: string
}

/**
 * Determine the file type category based on MIME type and filename
 */
export function getFileTypeCategory(mimeType: string, fileName: string): FileTypeCategory {
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  
  const ext = getFileExtension(fileName)
  
  if (mimeType.includes("pdf") || mimeType.includes("document") || 
      mimeType.includes("sheet") || mimeType.includes("presentation") || 
      mimeType.includes("text/")) return "document"
  
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar") || 
      mimeType.includes("7z") || mimeType.includes("gzip") || mimeType.includes("compress") ||
      ARCHIVE_EXTENSIONS.test(ext)) return "archive"
  
  if (VIDEO_EXTENSIONS.test(ext)) return "video"
  if (AUDIO_EXTENSIONS.test(ext)) return "audio"
  if (IMAGE_EXTENSIONS.test(ext)) return "image"
  
  return "other"
}

/**
 * Check if a file is embeddable media
 */
export function isEmbeddableMedia(file: { type: string; originalName?: string; name?: string }): boolean {
  const type = file.type || ""
  const name = file.originalName || file.name || ""
  return type.startsWith("video/") || type.startsWith("audio/") || type.startsWith("image/") ||
    /\.(mp4|webm|avi|mov|mkv|wmv|mp3|wav|ogg|flac|jpg|jpeg|png|gif|webp|svg)$/i.test(name)
}

/**
 * Get MIME type from file extension for import files
 */
export function getMimeTypeFromExtension(ext: string): string {
  const extLower = ext.toLowerCase()
  
  if (extLower === '.mp4') return 'video/mp4'
  if (extLower === '.webm') return 'video/webm'
  if (extLower === '.avi') return 'video/avi'
  if (extLower === '.mov') return 'video/quicktime'
  if (extLower === '.mkv') return 'video/x-matroska'
  if (extLower === '.mp3') return 'audio/mpeg'
  if (extLower === '.wav') return 'audio/wav'
  if (extLower === '.ogg') return 'audio/ogg'
  if (extLower === '.flac') return 'audio/flac'
  if (extLower === '.jpg' || extLower === '.jpeg') return 'image/jpeg'
  if (extLower === '.png') return 'image/png'
  if (extLower === '.gif') return 'image/gif'
  if (extLower === '.webp') return 'image/webp'
  if (extLower === '.svg') return 'image/svg+xml'
  if (extLower === '.pdf') return 'application/pdf'
  if (extLower === '.zip') return 'application/zip'
  if (extLower === '.rar') return 'application/x-rar-compressed'
  if (extLower === '.txt') return 'text/plain'
  
  return 'application/octet-stream'
}
