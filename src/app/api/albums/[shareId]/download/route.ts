import { NextRequest, NextResponse } from "next/server";
import { ZipArchive } from "archiver";
import fs from "fs";
import { auth } from "@/lib/auth";
import { getAlbumByShareId, verifyAlbumPassword, getAlbumZipEntries, buildZipDisposition, incrementAlbumDownloads } from "@/lib/albums";
import { logStatEvent } from "@/lib/stats";

/**
 * Streaming ZIP of all publicly accessible files of an album.
 * - Album name (if password set) protects the download.
 * - ZIP content: folder with the album shareId, contains every file with original name.
 * - Files with their own password are NOT included (only unlockable individually).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params;

  const album = await getAlbumByShareId(shareId);
  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  // The owner bypasses the album password
  const session = await auth();
  const isOwner = session?.user && album.userId === (session.user as any).id;

  if (album.password && !isOwner) {
    const password = request.nextUrl.searchParams.get("password");
    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 401 });
    }
    const valid = await verifyAlbumPassword(album, password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 403 });
    }
  }

  const entries = getAlbumZipEntries(album as any);
  if (entries.length === 0) {
    return NextResponse.json({ error: "No downloadable files in this album" }, { status: 404 });
  }

  const archive = new ZipArchive({ zlib: { level: 1 } });

  // Place files directly in the ZIP root. On name collision a suffix is added
  // so no duplicate entries are created.
  const usedNames = new Map<string, number>();
  const namedEntries = entries.map((entry) => {
    const originalName = entry.originalName || "file";
    const dot = originalName.lastIndexOf(".");
    const stem = dot > 0 ? originalName.slice(0, dot) : originalName;
    const ext = dot > 0 ? originalName.slice(dot) : "";
    const count = usedNames.get(originalName) || 0;
    const archiveName = count === 0 ? originalName : `${stem} (${count + 1})${ext}`;
    usedNames.set(originalName, count + 1);
    return { filePath: entry.filePath, archiveName };
  });

  for (const entry of namedEntries) {
    archive.append(fs.createReadStream(entry.filePath), {
      name: entry.archiveName,
    });
  }

  // Download counter + stats (fire-and-forget)
  incrementAlbumDownloads(shareId);
  logStatEvent("DOWNLOAD", { size: entries.reduce((s, e) => s + e.size, 0) });

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      archive.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      archive.on("end", () => controller.close());
      archive.on("error", (err: Error) => controller.error(err));
    },
  });

  const headers = {
    "Content-Type": "application/zip",
    "Content-Disposition": buildZipDisposition(album.name),
    "Cache-Control": "no-cache, no-transform",
    "X-Content-Type-Options": "nosniff",
  };

  archive.finalize();

  return new NextResponse(body, { headers });
}