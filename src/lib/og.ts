import { prisma } from "@/lib/prisma";
import { resolveTheme } from "@/lib/theme";

// ──────────────────────────────────────────────────────────
// OG BILD HELPERS (geteilt zwischen Datei- & Album-Routen)
// ──────────────────────────────────────────────────────────

/**
 * Dunkelt eine Hex-Farbe um den Faktor `factor` ab (RGB je × factor).
 * Standard: 0.7 → 30% dunkler, damit Icons/Schrift auf grellen
 * Akzentfarben besser lesbar sind.
 */
export function darkenColor(hex: string, factor = 0.7): string {
  const clean = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hex;

  const n = parseInt(clean, 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);

  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Lädt die Theme-Akzentfarben (bereits um 30% abgedunkelt) und den Site-Namen.
 */
export async function loadOgAccents(): Promise<{ accentFrom: string; accentTo: string; siteName: string }> {
  let accentFrom = "#ec4899";
  let accentTo = "#db2777";
  let siteName = "LinyaShare";

  try {
    const rows = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    rows.forEach((s) => {
      map[s.key] = s.value;
    });
    const theme = resolveTheme(map);
    accentFrom = theme.accentMode === "single" ? theme.accentColor : theme.accentFrom;
    accentTo = theme.accentMode === "single" ? theme.accentColor : theme.accentTo;
    siteName = map.siteName?.trim() || "LinyaShare";
  } catch {}

  return {
    accentFrom: darkenColor(accentFrom, 0.7),
    accentTo: darkenColor(accentTo, 0.7),
    siteName,
  };
}

/**
 * Rasterisiert ein SVG zu einem PNG-Buffer (density 144 → scharfe 1200x630).
 * Discord, Facebook & Co. rendern keine SVGs in Embeds.
 */
export async function renderOgPng(svg: string): Promise<ArrayBuffer> {
  const sharp = (await import("sharp")).default;
  const buffer = await sharp(Buffer.from(svg), { density: 144 }).png().toBuffer();
  // Buffer<ArrayBufferLike> ist kein gültiges BodyInit → als ArrayBuffer liefern
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

/**
 * Dunkler Overlay über dem Gradient, um Kontrast für Icons/Schrift zu verbessern.
 */
export function ogOverlayRect(width: number, height: number): string {
  return `<rect width="${width}" height="${height}" fill="rgba(0,0,0,0.15)"/>`;
}