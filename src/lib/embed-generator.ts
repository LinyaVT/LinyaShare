/**
 * Media embed generator for rich embeds (Discord, Twitter, Facebook, etc.)
 */

import { VIDEO_EXTENSIONS, AUDIO_EXTENSIONS, IMAGE_EXTENSIONS } from './constants'

// Re-export for backward compatibility
export { VIDEO_EXTENSIONS, IMAGE_EXTENSIONS, AUDIO_EXTENSIONS }

export function isVideoType(mimeType: string, fileName: string): boolean {
  return mimeType.startsWith("video/") || VIDEO_EXTENSIONS.test(fileName)
}

export function isAudioType(mimeType: string, fileName: string): boolean {
  return mimeType.startsWith("audio/") || AUDIO_EXTENSIONS.test(fileName)
}

export function isImageType(mimeType: string, fileName: string): boolean {
  return mimeType.startsWith("image/") || IMAGE_EXTENSIONS.test(fileName)
}

export function isSupportedMediaType(mimeType: string, fileName: string): boolean {
  return isVideoType(mimeType, fileName) || isAudioType(mimeType, fileName) || isImageType(mimeType, fileName)
}

export function getMediaCategory(mimeType: string, fileName: string): "video" | "audio" | "image" | null {
  if (isVideoType(mimeType, fileName)) return "video"
  if (isAudioType(mimeType, fileName)) return "audio"
  if (isImageType(mimeType, fileName)) return "image"
  return null
}

export function generateEmbedUrl(shareId: string, filename?: string, baseUrl?: string): string {
  const origin = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  // Append the file name so the URL ends with the file extension
  // (Discord & co. only recognize media files by such "direct" links).
  const name = filename ? `/${encodeURIComponent(filename)}` : ""
  return `${origin}/api/files/embed/${shareId}${name}`
}

export interface EmbedMeta {
  type: "video" | "audio" | "image"
  ogType: string
  streamUrl: string
  embedUrl: string
  title: string
}

export function generateEmbedMeta(
  shareId: string,
  fileName: string,
  mimeType: string,
  baseUrl?: string
): EmbedMeta | null {
  const category = getMediaCategory(mimeType, fileName)
  if (!category) return null

  const origin = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const streamUrl = `${origin}/api/files/stream/${shareId}`
  const embedUrl = generateEmbedUrl(shareId, fileName, origin)

  let ogType: string
  switch (category) {
    case "video":
      ogType = "video.other"
      break
    case "audio":
      ogType = "music.song"
      break
    case "image":
      ogType = "image"
      break
  }

  return {
    type: category,
    ogType,
    streamUrl,
    embedUrl,
    title: fileName,
  }
}

/**
 * Generates Open Graph meta tags as JSON-LD or HTML meta tags
 */
export function generateOpenGraphTags(meta: EmbedMeta): Record<string, string> {
  const tags: Record<string, string> = {
    "og:type": meta.ogType,
    "og:url": meta.embedUrl,
    "og:title": meta.title,
  }

  switch (meta.type) {
    case "video":
      tags["og:video"] = meta.streamUrl
      tags["og:video:secure_url"] = meta.streamUrl
      tags["og:video:type"] = "video/mp4"
      tags["og:video:width"] = "1280"
      tags["og:video:height"] = "720"
      break
    case "audio":
      tags["og:audio"] = meta.streamUrl
      tags["og:audio:secure_url"] = meta.streamUrl
      tags["og:audio:type"] = "audio/mpeg"
      break
    case "image":
      tags["og:image"] = meta.streamUrl
      tags["og:image:secure_url"] = meta.streamUrl
      tags["og:image:type"] = "image/jpeg"
      break
  }

  return tags
}