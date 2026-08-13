import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CUSTOM_FONTS_DIR } from "@/lib/constants";
import {
  parseCustomFonts,
  type CustomFontEntry,
} from "@/lib/theme";
import { detectFontType } from "@/lib/file-security";
import { mkdir, writeFile, rm, stat } from "fs/promises";
import { existsSync } from "fs";
import { randomBytes } from "crypto";
import path from "path";

// ──────────────────────────────────────────────────────────
// ADMIN CUSTOM FONTS
// Ablage: data/uploads/global/fonts/custom/<key>/font.<ext> + style.css
// Metadaten werden als JSON im Setting `theme.customFonts` gespeichert.
// POST/DELETE nur für Admins, GET (Admin) listet die Uploads.
// ──────────────────────────────────────────────────────────

const KEY_RE = /^custom-[a-z0-9-]+$/
const MAX_FONT_SIZE = 20 * 1024 * 1024 // 20MB Sanity-Grenze

const customEntryDir = (key: string) => path.join(CUSTOM_FONTS_DIR, key)

async function readCustomFonts(): Promise<CustomFontEntry[]> {
  const row = await prisma.setting.findUnique({
    where: { key: "theme.customFonts" },
    select: { value: true },
  })
  return parseCustomFonts(row?.value)
}

async function writeCustomFonts(entries: CustomFontEntry[]): Promise<void> {
  await prisma.setting.upsert({
    where: { key: "theme.customFonts" },
    update: { value: JSON.stringify(entries) },
    create: { key: "theme.customFonts", value: JSON.stringify(entries) },
  })
}

// Erlaubt nur CSS-sichere Zeichen für family/label (keine Quotes, kein CSS-Breakout).
function sanitizeName(raw: string): string {
  return raw
    .replace(/[^a-zA-Z0-9 \u00C0-\u024F_-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug.slice(0, 40) || "font"
}

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await readCustomFonts();
  const result = await Promise.all(
    entries.map(async (e) => {
      let size = 0;
      try {
        const s = await stat(path.join(customEntryDir(e.key), `font${e.ext}`));
        size = s.size;
      } catch {
        // Datei fehlt → size bleibt 0
      }
      return { ...e, size };
    })
  );
  return NextResponse.json({ fonts: result });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const rawName = String(form.get("name") || "").trim();
    const file = form.get("file");
    if (!rawName) {
      return NextResponse.json({ error: "Bitte einen Schriften-Namen angeben" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Keine Datei erhalten" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Leere Datei" }, { status: 400 });
    }
    if (file.size > MAX_FONT_SIZE) {
      return NextResponse.json({ error: "Datei zu groß (max. 20MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectFontType(buffer);
    if (!detected) {
      return NextResponse.json(
        { error: "Keine gültige Schriftdatei (nur TTF, OTF, WOFF, WOFF2 oder TTC)" },
        { status: 400 }
      );
    }

    // Eindeutigen Key erzeugen (collision-sicher)
    let key = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = `custom-${slugify(rawName)}-${randomBytes(3).toString("hex")}`;
      if (!existsSync(customEntryDir(candidate))) {
        key = candidate;
        break;
      }
    }
    if (!key) {
      return NextResponse.json({ error: "Key-Erzeugung fehlgeschlagen" }, { status: 500 });
    }

    const family = sanitizeName(rawName);
    const dir = customEntryDir(key);
    await mkdir(dir, { recursive: true, mode: 0o755 });

    const fontPath = path.join(dir, `font${detected.ext}`);
    await writeFile(fontPath, buffer);

    const css = `@font-face {\n  font-family: '${family}';\n  font-style: normal;\n  font-weight: 400;\n  font-display: swap;\n  src: url('./font${detected.ext}') format('${detected.format}');\n}\n`;
    await writeFile(path.join(dir, "style.css"), css, "utf8");

    const entry: CustomFontEntry = {
      key,
      label: family,
      family: `'${family}', sans-serif`,
      ext: detected.ext,
      mime: detected.mimeType,
    };

    const entries = await readCustomFonts();
    entries.push(entry);
    await writeCustomFonts(entries);

    return NextResponse.json({ success: true, font: entry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Upload fehlgeschlagen" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { key } = await request.json();
    if (!key || !KEY_RE.test(String(key))) {
      return NextResponse.json({ error: "Ungültiger Font-Key" }, { status: 400 });
    }

    const entries = await readCustomFonts();
    const next = entries.filter((e) => e.key !== key);
    if (next.length === entries.length) {
      return NextResponse.json({ error: "Font nicht gefunden" }, { status: 404 });
    }
    await writeCustomFonts(next);

    const dir = customEntryDir(key);
    if (existsSync(dir)) {
      await rm(dir, { recursive: true, force: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Löschen fehlgeschlagen" }, { status: 500 });
  }
}