import { Metadata } from "next"
import { MetadataRoute } from "next"
import SharePageClient from "@/components/SharePageClient"
import { getFileByShareId } from "@/lib/upload"
import { getSiteName } from "@/lib/settings"
import { getFileTypeCategory } from "@/lib/utils"

const TYPE_LABELS: Record<string, string> = {
  video: "Video",
  audio: "Audio",
  image: "Image",
  document: "Document",
  archive: "Archive",
  code: "Code & Script",
  executable: "Program",
  model: "3D Model",
  data: "Data & Config",
  database: "Database",
  font: "Font",
  pdf: "PDF",
  spreadsheet: "Spreadsheet",
  presentation: "Presentation",
  ebook: "E-Book",
  subtitle: "Subtitle",
  design: "Design",
  key: "Key / Certificate",
}

type PageProps = {
  params: Promise<{ shareId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params
  const siteName = await getSiteName()

  try {
    const file = await getFileByShareId(shareId)
    
    if (!file) {
      return {
        title: `File Not Found - ${siteName}`,
        description: "This file link is invalid or has been deleted.",
      }
    }

    const fileName = file.originalName || file.name
    const fileType = file.type || ""
    const hasPassword = !!file.password
    const uploader = file.user?.name || "Unknown"
    
    // Bestimme Dateityp-Label über die zentrale Klassifikation
    const typeLabel = TYPE_LABELS[getFileTypeCategory(fileType || "", fileName)] || "File"

    const title = `${fileName} - ${siteName}`
    const description = `${typeLabel} shared by ${uploader}${hasPassword ? " (Password Protected)" : ""}`
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://linyashare.sknif.de"
    const shareUrl = `${baseUrl}/s/${shareId}`
    const ogImageUrl = `${baseUrl}/api/og/${shareId}.png`

    // Open Graph Metadata
    const metadata: Metadata = {
      title,
      description,
      openGraph: {
        title,
        description,
        url: shareUrl,
        siteName,
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

    // Zusätzliche Meta-Tags für Bild/Video/Audio
    if (!hasPassword) {
      const isImage = fileType.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp|ico|svg)$/i.test(fileName)
      const isVideo = fileType.startsWith("video/") || /\.(mp4|webm|avi|mov|mkv|wmv)$/i.test(fileName)
      const isAudio = fileType.startsWith("audio/") || /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(fileName)

      // Direkter Media-Link (endet auf die Dateiendung) – so erkennen Discord & Co.
      // die Datei als Bild/Video/Audio und zeigen Vorschau an. Bilder werden so
      // wie Videos behandelt: die URL endet auf die echte Dateiendung (.png etc.)
      // und liefert das tatsächlich hochgeladene Bild aus.
      const mediaUrl = `${baseUrl}/api/files/embed/${shareId}/${encodeURIComponent(fileName)}`

      if (isImage) {
        metadata.openGraph = {
          ...metadata.openGraph,
          images: [{
            url: mediaUrl,
            width: 1200,
            height: 630,
            alt: fileName,
          }],
        }
        metadata.twitter = {
          ...metadata.twitter,
          images: [mediaUrl],
        }
      } else if (isVideo) {
        metadata.openGraph = {
          ...metadata.openGraph,
          type: "video.other",
          videos: [{
            url: mediaUrl,
            secureUrl: mediaUrl,
            type: fileType || "video/mp4",
          }],
        }
      } else if (isAudio) {
        metadata.openGraph = {
          ...metadata.openGraph,
          type: "music.song",
          audio: [{
            url: mediaUrl,
            secureUrl: mediaUrl,
            type: fileType || "audio/mpeg",
          }],
        }
      }
    }

    return metadata
  } catch (error) {
    return {
      title: `${siteName} - Secure File Sharing`,
      description: "Share files securely with password protection.",
    }
  }
}

export default async function SharePage({ params }: PageProps) {
  const { shareId } = await params
  
  return <SharePageClient shareId={shareId} />
}