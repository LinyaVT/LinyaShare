import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAlbumByShareId, updateAlbum, deleteAlbum, incrementAlbumViews } from "@/lib/albums";
import { isEmbeddableMedia } from "@/lib/utils";
import { MAX_EMBED_SIZE } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params;
  const album = await getAlbumByShareId(shareId);

  if (!album) {
    return NextResponse.json({ exists: false });
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const files = album.items.map((i) => {
    const file = i.file;
    const embedUrl =
      file.isMediaEmbed && !file.password && file.size < MAX_EMBED_SIZE
        ? `${baseUrl}/api/files/embed/${file.shareId}/${encodeURIComponent(file.originalName)}`
        : undefined;
    return {
      id: file.id,
      shareId: file.shareId,
      originalName: file.originalName,
      type: file.type,
      size: file.size,
      downloads: file.downloads,
      views: file.views,
      hasPassword: !!file.password,
      embedUrl,
      streamUrl: `/api/files/stream/${file.shareId}`,
      shareUrl: `${baseUrl}/s/${file.shareId}`,
    };
  });

  const cover = files.find((f) => isEmbeddableMedia({ type: f.type, originalName: f.originalName })) || null;

  // View counter (fire-and-forget) – skipped at ?count=0 (browser cache of clients)
  if (request.nextUrl.searchParams.get("count") !== "0") {
    incrementAlbumViews(shareId);
  }

  return NextResponse.json({
    exists: true,
    id: album.id,
    shareId: album.shareId,
    name: album.name,
    description: album.description,
    hasPassword: !!album.password,
    uploader: album.user?.name || "Unknown",
    views: album.views,
    downloads: album.downloads,
    createdAt: album.createdAt,
    fileCount: files.length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
    publicFileCount: files.filter((f) => !f.hasPassword).length,
    protectedFileCount: files.filter((f) => f.hasPassword).length,
    shareUrl: `${baseUrl}/a/${shareId}`,
    cover,
    files,
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { shareId } = await params;
    const body = await request.json();

    const album = await updateAlbum(shareId, (session.user as any).id, {
      name: body.name !== undefined ? String(body.name).trim().slice(0, 100) : undefined,
      description:
        body.description !== undefined
          ? body.description === null || String(body.description).trim() === ""
            ? null
            : String(body.description).slice(0, 500)
          : undefined,
      password: body.password !== undefined ? (body.password ? String(body.password) : null) : undefined,
      addFileIds: Array.isArray(body.addFileIds) ? body.addFileIds : undefined,
      removeFileIds: Array.isArray(body.removeFileIds) ? body.removeFileIds : undefined,
    });

    return NextResponse.json({
      success: true,
      fileCount: album.items.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { shareId } = await params;
    await deleteAlbum(shareId, (session.user as any).id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}