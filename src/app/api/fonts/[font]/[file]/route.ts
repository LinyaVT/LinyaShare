import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { FONT_MAP } from "@/lib/theme";
import { getBuiltinFontCss, getCustomFontCss, resolveFontFile, FONT_MIME } from "@/lib/fonts";

// ──────────────────────────────────────────────────────────
// PUBLIC FONT SERVING
// GET /api/fonts/<font>/style.css   → @font-face-CSS (local, cached)
// GET /api/fonts/<font>/<file>      → Font-Datei (woff2/woff/ttf/otf)
// Builtin-Fonts werden beim ersten Aufruf einmalig heruntergeladen und
// lokal gecacht; Custom-Fonts (data/uploads/global/fonts/custom) werden
// direkt ausgeliefert. Öffentliche Route – keine Auth nötig.
// ──────────────────────────────────────────────────────────

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ font: string; file: string }> }
) {
  const { font, file } = await context.params;
  try {
    // CSS für font-face laden
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

    // Font-Datei ausliefern
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
        // Builtin-woff2 werden nie überschrieben → immutable. Custom-Fonts
        // können neu hochgeladen werden → kürzeres Cache-Fenster.
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