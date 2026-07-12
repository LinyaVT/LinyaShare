import { Metadata } from "next"
import { MetadataRoute } from "next"
import SharePageClient from "@/components/SharePageClient"
import { getFileByShareId } from "@/lib/upload"

type PageProps = {
  params: Promise<{ shareId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params
  
  try {
    const file = await getFileByShareId(shareId)
    
    if (!file) {
      return {
        title: "File Not Found - LinyaShare",
        description: "This file link is invalid or has been deleted.",
      }
    }

    const fileName = file.originalName || file.name
    const fileType = file.type || ""
    const hasPassword = !!file.password
    const uploader = file.user?.name || "Unknown"
    
    // Bestimme Dateityp für Beschreibung
    let typeLabel = "File"
    if (fileType.startsWith("image/")) typeLabel = "Image"
    else if (fileType.startsWith("video/")) typeLabel = "Video"
    else if (fileType.startsWith("audio/")) typeLabel = "Audio"
    else if (fileType.includes("archive") || /\.(zip|rar|tar|gz|7z)$/i.test(fileName)) typeLabel = "Archive"
    else if (fileType.includes("text") || /\.(txt|md|doc|pdf)$/i.test(fileName)) typeLabel = "Document"

    const title = `${fileName} - LinyaShare`
    const description = `${typeLabel} shared by ${uploader}${hasPassword ? " (Password Protected)" : ""}`
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://linyashare.sknif.de"
    const shareUrl = `${baseUrl}/s/${shareId}`
    const ogImageUrl = `${baseUrl}/api/og/${shareId}`

    // Open Graph Metadata
    const metadata: Metadata = {
      title,
      description,
      openGraph: {
        title,
        description,
        url: shareUrl,
        siteName: "LinyaShare",
        type: "website",
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: fileName,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
      },
    }

    // Zusätzliche Meta-Tags für Video/Audio
    if (!hasPassword) {
      const isVideo = fileType.startsWith("video/") || /\.(mp4|webm|avi|mov|mkv|wmv)$/i.test(fileName)
      const isAudio = fileType.startsWith("audio/") || /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(fileName)
      
      if (isVideo) {
        metadata.openGraph = {
          ...metadata.openGraph,
          type: "video.other",
          videos: [shareUrl],
        }
      } else if (isAudio) {
        metadata.openGraph = {
          ...metadata.openGraph,
          type: "music.song",
          audio: shareUrl,
        }
      }
    }

    return metadata
  } catch (error) {
    return {
      title: "LinyaShare - Secure File Sharing",
      description: "Share files securely with password protection.",
    }
  }
}

export default async function SharePage({ params }: PageProps) {
  const { shareId } = await params
  
  return <SharePageClient shareId={shareId} />
}