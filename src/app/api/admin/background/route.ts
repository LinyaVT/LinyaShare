import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { mkdir, readdir, writeFile, unlink, readFile, chmod } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { BACKGROUND_DIR } from "@/lib/constants";
import { detectFileType } from "@/lib/file-security";

// ──────────────────────────────────────────────────────────
// ADMIN BACKGROUND IMAGE
// POST/DELETE only for admins, GET public (loaded as CSS background
// on the public page via `url('/api/admin/background')`).
//
// Storage: data/uploads/global/background/background.<ext>
// Only one file always exists (the old one is deleted on upload).
// ──────────────────────────────────────────────────────────

const MIME_TO_EXT: Record<string, { ext: string; mime: string }> = {
  "image/png": { ext: ".png", mime: "image/png" },
  "image/jpeg": { ext: ".jpg", mime: "image/jpeg" },
  "image/gif": { ext: ".gif", mime: "image/gif" },
  "image/webp": { ext: ".webp", mime: "image/webp" },
  "image/avif": { ext: ".avif", mime: "image/avif" },
  "image/bmp": { ext: ".bmp", mime: "image/bmp" },
  "image/tiff": { ext: ".tif", mime: "image/tiff" },
  "image/x-icon": { ext: ".ico", mime: "image/x-icon" },
};

const EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".ico": "image/x-icon",
};

async function ensureDir(): Promise<void> {
  if (!existsSync(BACKGROUND_DIR)) {
    await mkdir(BACKGROUND_DIR, { recursive: true, mode: 0o755 });
  }
}

async function findBackground(): Promise<{ filePath: string; mime: string } | null> {
  await ensureDir();
  const files = await readdir(BACKGROUND_DIR);
  const bg = files.find((f) => /^background\./.test(f));
  if (!bg) return null;
  return {
    filePath: path.join(BACKGROUND_DIR, bg),
    mime: EXT_TO_MIME[path.extname(bg).toLowerCase()] || "application/octet-stream",
  };
}

async function removeAllBackgrounds(): Promise<void> {
  const files = await readdir(BACKGROUND_DIR);
  await Promise.all(
    files
      .filter((f) => /^background\./.test(f))
      .map((f) => unlink(path.join(BACKGROUND_DIR, f)).catch(() => {}))
  );
}

export async function GET() {
  try {
    const bg = await findBackground();
    if (!bg) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const buffer = await readFile(bg.filePath);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": bg.mime,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const buffer = Buffer.from(await request.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    // Magic-bytes verification: only allow real image formats (SVG etc. → rejected)
    const detected = detectFileType(buffer);
    const target = MIME_TO_EXT[detected.mimeType];
    if (!target) {
      return NextResponse.json({ error: "Only image files are allowed (PNG, JPG, GIF, WebP, AVIF, BMP, TIFF)" }, { status: 400 });
    }

    await ensureDir();
    await removeAllBackgrounds();

    const finalPath = path.join(BACKGROUND_DIR, `background${target.ext}`);
    await writeFile(finalPath, buffer);
    await chmod(finalPath, 0o644).catch(() => {});

    return NextResponse.json({ success: true, mimeType: target.mime }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDir();
    await removeAllBackgrounds();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}