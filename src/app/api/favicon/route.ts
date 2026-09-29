import { NextResponse } from "next/server";
import { FAVICON_DIR } from "@/lib/constants";
import { existsSync } from "fs";
import { readdir, readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
const FAVICON_FILE_RE = /^favicon\.(png|jpg|gif|webp|avif|ico)$/i;

const EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
};

async function findCustomFavicon(): Promise<{ filePath: string; mime: string } | null> {
  if (!existsSync(FAVICON_DIR)) return null;
  const files = await readdir(FAVICON_DIR);
  const favicon = files.find((file) => FAVICON_FILE_RE.test(file));
  if (!favicon) return null;

  return {
    filePath: path.join(FAVICON_DIR, favicon),
    mime: EXT_TO_MIME[path.extname(favicon).toLowerCase()] || "application/octet-stream",
  };
}

export async function GET() {
  try {
    const custom = await findCustomFavicon();
    const filePath = custom?.filePath || path.join(process.cwd(), "public", "favicon.ico");
    const mime = custom?.mime || "image/x-icon";
    const buffer = await readFile(filePath);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Favicon not found" }, { status: 404 });
  }
}
