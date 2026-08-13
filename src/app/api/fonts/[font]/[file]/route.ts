import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { FONT_MAP } from "@/lib/theme";
import { getBuiltinFontCss, getCustomFontCss, resolveFontFile, FONT_MIME } from "@/lib/fonts";

// ──────────────────────────────────────────────────────────
// PUBLIC FONT SERVING
// GET /api/fonts/<font>/style.css   → @font-face CSS (local, cached)
// GET /api/fonts/<font>/<file>      → Font file (woff2/woff/ttf/otf)
// Built-in fonts are downloaded once on first call and
// cached locally; custom fonts (data/uploads/global/fonts/custom) are
// served directly. Public route – no auth needed.
// ──────────────────────────────────────────────────────────

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ font: string; file: string }> }
) {
  const { font, file } = await context.params;
  try {
    // Load the CSS for the font-face
    if (file === "style.css") {
      let css: string;
      if (FONT_MAP[font]) {
        css = await getBuiltinFontCss(font);
      } else {
        css = await getCustomFontCss(font);
      }
      return new NextResponse(css, {
        status: 200,
        headers: {
          "Content-Type": "text/css; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // Deliver the font file
    const resolved = resolveFontFile(font, file);
    if (!resolved || !existsSync(resolved.absPath)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const buf = await readFile(resolved.absPath);
    const ext = path.extname(resolved.absPath).toLowerCase();
    const mime = FONT_MIME[ext] || "application/octet-stream";
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": buf.length.toString(),
        // Built-in woff2 files are never overwritten → immutable. Custom fonts
        // can be re-uploaded → shorter cache window.
        "Cache-Control": resolved.isCustom
          ? "public, max-age=3600"
          : "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}