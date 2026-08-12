import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAlbum, getUserAlbums, getAlbumShareUrl } from "@/lib/albums";
import { isEmbeddableMedia } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const albums = await getUserAlbums(userId);

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  return NextResponse.json({
    albums: albums.map((album) => {
      const files = album.items.map((i) => i.file);
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      const cover = files.find((f) => isEmbeddableMedia(f)) || files[0] || null;

      return {
        id: album.id,
        shareId: album.shareId,
        name: album.name,
        description: album.description,
        hasPassword: !!album.password,
        views: album.views,
        downloads: album.downloads,
        createdAt: album.createdAt,
        updatedAt: album.updatedAt,
        fileCount: files.length,
        totalSize,
        cover: cover
          ? {
              shareId: cover.shareId,
              originalName: cover.originalName,
              type: cover.type,
              isMedia: isEmbeddableMedia(cover),
            }
          : null,
        shareUrl: `${baseUrl}/a/${album.shareId}`,
        items: album.items.map((i) => ({
          fileId: i.file.id,
          shareId: i.file.shareId,
          originalName: i.file.originalName,
          type: i.file.type,
          size: i.file.size,
          hasPassword: !!i.file.password,
        })),
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, password, fileIds } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Album name is required" }, { status: 400 });
    }
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: "At least one file is required" }, { status: 400 });
    }

    const album = await createAlbum({
      name: String(name).trim().slice(0, 100),
      description: description ? String(description).slice(0, 500) : undefined,
      password: password ? String(password) : undefined,
      userId: (session.user as any).id,
      fileIds,
    });

    return NextResponse.json({
      success: true,
      album: {
        id: album.id,
        shareId: album.shareId,
        name: album.name,
        shareUrl: getAlbumShareUrl(album.shareId),
        fileCount: album.items.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}