import { prisma } from "@/lib/prisma";
import { resolveTheme } from "@/lib/theme";

// ──────────────────────────────────────────────────────────
// OG IMAGE HELPERS (shared between file & album routes)
// ──────────────────────────────────────────────────────────

/**
 * Darkens a hex color by the `factor` (each RGB channel × factor).
 * Default: 0.7 → 30% darker, so icons/text are more readable
 * on bright accent colors.
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
 * Loads the theme accent colors (already 30% darkened) and the site name.
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
 * Rasterizes an SVG to a PNG buffer (density 144 → sharp 1200x630).
 * Discord, Facebook & co. do not render SVGs in embeds.
 */
export async function renderOgPng(svg: string): Promise<ArrayBuffer> {
  const sharp = (await import("sharp")).default;
  const buffer = await sharp(Buffer.from(svg), { density: 144 }).png().toBuffer();
  // Buffer<ArrayBufferLike> is not a valid BodyInit → deliver as ArrayBuffer
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

/**
 * Dark overlay on top of the gradient to improve contrast for icons/text.
 */
export function ogOverlayRect(width: number, height: number): string {
  return `<rect width="${width}" height="${height}" fill="rgba(0,0,0,0.15)"/>`;
}