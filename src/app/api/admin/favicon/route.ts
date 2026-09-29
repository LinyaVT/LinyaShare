import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { FAVICON_DIR } from "@/lib/constants";
import { detectFaviconType } from "@/lib/file-security";
import { existsSync } from "fs";
import { chmod, mkdir, readdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

const MAX_FAVICON_SIZE = 2 * 1024 * 1024;
const FAVICON_FILE_RE = /^favicon\.(png|jpg|gif|webp|avif|ico)$/i;

const EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
};

async function ensureDir(): Promise<void> {
  if (!existsSync(FAVICON_DIR)) {
    await mkdir(FAVICON_DIR, { recursive: true, mode: 0o755 });
  }
}

async function findFavicon(): Promise<{ filePath: string; mime: string } | null> {
  await ensureDir();
  const files = await readdir(FAVICON_DIR);
  const favicon = files.find((file) => FAVICON_FILE_RE.test(file));
  if (!favicon) return null;

  return {
    filePath: path.join(FAVICON_DIR, favicon),
    mime: EXT_TO_MIME[path.extname(favicon).toLowerCase()] || "application/octet-stream",
  };
}

async function removeAllFavicons(): Promise<void> {
  const files = await readdir(FAVICON_DIR);
  await Promise.all(
    files
      .filter((file) => FAVICON_FILE_RE.test(file))
      .map((file) => unlink(path.join(FAVICON_DIR, file)).catch(() => {}))
  );
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const favicon = await findFavicon();
    if (!favicon) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buffer = await readFile(favicon.filePath);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": favicon.mime,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const buffer = Buffer.from(await request.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }
    if (buffer.length > MAX_FAVICON_SIZE) {
      return NextResponse.json({ error: "File too large (max. 2MB)" }, { status: 400 });
    }

    const detected = detectFaviconType(buffer);
    if (!detected) {
      return NextResponse.json(
        { error: "Only valid PNG, JPG, GIF, WebP, AVIF or ICO files are allowed" },
        { status: 400 }
      );
    }

    await ensureDir();
    await removeAllFavicons();

    const finalPath = path.join(FAVICON_DIR, `favicon${detected.ext}`);
    await writeFile(finalPath, buffer);
    await chmod(finalPath, 0o644).catch(() => {});

    return NextResponse.json({ success: true, mimeType: detected.mimeType });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}

export async function DELETE() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDir();
    await removeAllFavicons();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Deletion failed" }, { status: 500 });
  }
}
