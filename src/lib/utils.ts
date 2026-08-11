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

import { VIDEO_EXTENSIONS, AUDIO_EXTENSIONS, IMAGE_EXTENSIONS, ARCHIVE_EXTENSIONS, CODE_EXTENSIONS, EXECUTABLE_EXTENSIONS, MODEL_EXTENSIONS, DATA_EXTENSIONS, FONT_EXTENSIONS, DOCUMENT_EXTENSIONS, PDF_EXTENSIONS, SPREADSHEET_EXTENSIONS, PRESENTATION_EXTENSIONS, EBOOK_EXTENSIONS, SUBTITLE_EXTENSIONS, DESIGN_EXTENSIONS, DATABASE_EXTENSIONS, KEY_EXTENSIONS } from "./constants"

export type FileTypeCategory = "video" | "audio" | "image" | "document" | "archive" | "code" | "executable" | "model" | "data" | "font" | "pdf" | "spreadsheet" | "presentation" | "ebook" | "subtitle" | "design" | "database" | "key" | "other"

export interface FileTypeInfo {
  category: FileTypeCategory
  label: string
  color: string
  bgClass: string
}

/**
 * Determine the file type category based on MIME type and filename.
 * Spezifische Extension-Kategorien werden vor den generischen MIME-Fallbacks
 * geprüft, damit z.B. eine .jar (zip-MIME) nicht als Archiv gilt.
 */
export function getFileTypeCategory(mimeType: string, fileName: string): FileTypeCategory {
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"

  if (CODE_EXTENSIONS.test(fileName)) return "code"
  if (EXECUTABLE_EXTENSIONS.test(fileName)) return "executable"
  if (MODEL_EXTENSIONS.test(fileName)) return "model"
  if (DATA_EXTENSIONS.test(fileName)) return "data"
  if (DATABASE_EXTENSIONS.test(fileName)) return "database"
  if (FONT_EXTENSIONS.test(fileName)) return "font"
  if (DESIGN_EXTENSIONS.test(fileName)) return "design"
  if (KEY_EXTENSIONS.test(fileName)) return "key"
  if (PDF_EXTENSIONS.test(fileName)) return "pdf"
  if (SPREADSHEET_EXTENSIONS.test(fileName)) return "spreadsheet"
  if (PRESENTATION_EXTENSIONS.test(fileName)) return "presentation"
  if (EBOOK_EXTENSIONS.test(fileName)) return "ebook"
  if (SUBTITLE_EXTENSIONS.test(fileName)) return "subtitle"
  if (DOCUMENT_EXTENSIONS.test(fileName)) return "document"

  // Differenzierte MIME-Fallbacks (für Dateien ohne erkannte Endung)
  if (mimeType.includes("pdf")) return "pdf"
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "spreadsheet"
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "presentation"
  if (mimeType.includes("text/") || mimeType.includes("document") || mimeType.includes("word")) return "document"

  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar") || 
      mimeType.includes("7z") || mimeType.includes("gzip") || mimeType.includes("compress") ||
      ARCHIVE_EXTENSIONS.test(fileName)) return "archive"
  
  if (VIDEO_EXTENSIONS.test(fileName)) return "video"
  if (AUDIO_EXTENSIONS.test(fileName)) return "audio"
  if (IMAGE_EXTENSIONS.test(fileName)) return "image"
  
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
 * Generate a UUID v4 that works in insecure contexts.
 * `crypto.randomUUID()` only exists in secure contexts (HTTPS or localhost),
 * so fall back to `crypto.getRandomValues()` which is available everywhere.
 */
export function uuidV4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
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
  if (extLower === '.jar') return 'application/java-archive'
  if (extLower === '.py' || extLower === '.pyw') return 'text/x-python'
  if (extLower === '.js') return 'text/javascript'
  if (extLower === '.ts') return 'text/typescript'
  if (extLower === '.json') return 'application/json'
  if (extLower === '.xml') return 'application/xml'
  if (extLower === '.yaml' || extLower === '.yml') return 'application/yaml'
  if (extLower === '.toml') return 'application/toml'
  if (extLower === '.ini' || extLower === '.cfg' || extLower === '.conf') return 'text/plain'
  if (extLower === '.db' || extLower === '.sqlite' || extLower === '.sqlite3') return 'application/vnd.sqlite3'
  if (extLower === '.ttf') return 'font/ttf'
  if (extLower === '.otf') return 'font/otf'
  if (extLower === '.woff') return 'font/woff'
  if (extLower === '.woff2') return 'font/woff2'
  if (extLower === '.stl') return 'model/stl'
  if (extLower === '.obj') return 'model/obj'
  if (extLower === '.glb') return 'model/gltf-binary'
  if (extLower === '.gltf') return 'model/gltf+json'
  if (extLower === '.exe') return 'application/x-msdownload'
  if (extLower === '.bat' || extLower === '.cmd') return 'application/x-bat'
  if (extLower === '.pdf') return 'application/pdf'
  if (extLower === '.ppt' || extLower === '.pptx' || extLower === '.odp') return 'application/vnd.ms-powerpoint'
  if (extLower === '.xls' || extLower === '.xlsx') return 'application/vnd.ms-excel'
  if (extLower === '.ods') return 'application/vnd.oasis.opendocument.spreadsheet'
  if (extLower === '.csv') return 'text/csv'
  if (extLower === '.doc' || extLower === '.docx') return 'application/msword'
  if (extLower === '.md') return 'text/markdown'
  if (extLower === '.epub') return 'application/epub+zip'
  if (extLower === '.mobi' || extLower === '.azw' || extLower === '.azw3') return 'application/x-mobipocket-ebook'
  if (extLower === '.djvu') return 'image/vnd.djvu'
  if (extLower === '.srt') return 'application/x-subrip'
  if (extLower === '.vtt') return 'text/vtt'
  if (extLower === '.ass' || extLower === '.ssa') return 'text/x-ssa'
  if (extLower === '.psd') return 'image/vnd.adobe.photoshop'
  if (extLower === '.ai' || extLower === '.eps') return 'application/postscript'
  if (extLower === '.pem' || extLower === '.crt' || extLower === '.cer') return 'application/x-pem-file'
  if (extLower === '.key' || extLower === '.pfx' || extLower === '.p12') return 'application/x-pkcs12'
  if (extLower === '.iso') return 'application/x-iso9660-image'
  if (extLower === '.torrent') return 'application/x-bittorrent'
  if (extLower === '.kml') return 'application/vnd.google-earth.kml+xml'
  if (extLower === '.gpx') return 'application/gpx+xml'
  if (extLower === '.html' || extLower === '.htm') return 'text/html'
  if (extLower === '.css') return 'text/css'
  
  return 'application/octet-stream'
}
