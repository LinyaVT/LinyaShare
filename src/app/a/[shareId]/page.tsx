import { Metadata } from "next";
import AlbumPageClient from "@/components/AlbumPageClient";
import { getAlbumByShareId } from "@/lib/albums";
import { getSiteName } from "@/lib/settings";

type PageProps = {
  params: Promise<{ shareId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params;
  const siteName = await getSiteName();

  try {
    const album = await getAlbumByShareId(shareId);

    if (!album) {
      return {
        title: `Gallery Not Found - ${siteName}`,
        description: "This gallery link is invalid or has been deleted.",
      };
    }

    const hasPassword = !!album.password;
    const uploader = album.user?.name || "Unknown";
    const fileCount = album.items.length;
    const title = `${album.name} - ${siteName}`;
    const description = `Gallery with ${fileCount} file${fileCount !== 1 ? "s" : ""} shared by ${uploader}${hasPassword ? " (Password Protected)" : ""}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://linyashare.sknif.de";
    const shareUrl = `${baseUrl}/a/${shareId}`;

    // Cover = erstes Bild-Medium für die OG-Vorschau
    // Falls kein Cover existiert → eigenes Album-OG-Bild (statt der Datei-Route,
    // die bei Alben 404 liefert)
    const coverItem = album.items.find((i) => i.file.embedUrl && !i.file.password) || null;
    const ogImageUrl = coverItem
      ? `${baseUrl}/api/files/embed/${coverItem.file.shareId}/${encodeURIComponent(coverItem.file.originalName)}`
      : `${baseUrl}/api/og/album/${shareId}.png`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: shareUrl,
        siteName,
        type: "website",
        images: [{ url: ogImageUrl, width: 1200, height: 630, alt: album.name }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch (error) {
    return {
      title: `${siteName} - Secure File Sharing`,
      description: "Share files securely with password protection.",
    };
  }
}

export default async function AlbumPage({ params }: PageProps) {
  const { shareId } = await params;
  return <AlbumPageClient shareId={shareId} />;
}