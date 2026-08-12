import { NextRequest, NextResponse } from "next/server";
import { getAlbumByShareId } from "@/lib/albums";
import { loadOgAccents, renderOgPng, ogOverlayRect } from "@/lib/og";

// ──────────────────────────────────────────────────────────
// OG IMAGE FÜR ALBEN (1200x630)
// Wird genutzt, wenn ein Album kein eigenes Bild-Cover hat.
// Theme-Akzentfarben werden um 30% abgedunkelt + dunkler Overlay.
// ──────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    // .png-Suffix abstreifen (Discord & Co. zeigen OG-Bilder nur mit Dateiendung)
    const { shareId: rawId } = await params;
    const shareId = rawId.replace(/\.png$/i, "");

    const album = await getAlbumByShareId(shareId);
    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const { accentFrom, accentTo, siteName } = await loadOgAccents();

    const width = 1200;
    const height = 630;

    const hasPassword = !!album.password;
    const uploader = album.user?.name || "Unknown";
    const fileCount = album.items.length;
    const name = album.name || "Untitled Gallery";

    const svg = generateAlbumSvg(width, height, name, fileCount, uploader, siteName, hasPassword, accentFrom, accentTo);

    const pngBuffer = await renderOgPng(svg);

    return new NextResponse(pngBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": pngBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function generateAlbumSvg(
  width: number,
  height: number,
  name: string,
  fileCount: number,
  uploader: string,
  siteName: string,
  hasPassword: boolean,
  accentFrom: string,
  accentTo: string
) {
  const truncatedName = name.length > 38 ? name.substring(0, 38) + "..." : name;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${accentFrom};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${accentTo};stop-opacity:1" />
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  ${ogOverlayRect(width, height)}

  <!-- Gallery Icon (2x2 Bildergitter) -->
  <g transform="translate(${width / 2}, ${height / 2 - 70})" opacity="0.95">
    <rect x="-70" y="-55" width="60" height="50" rx="8" fill="#3b82f6" opacity="0.3" stroke="#60a5fa" stroke-width="3"/>
    <rect x="-5" y="-55" width="60" height="50" rx="8" fill="#3b82f6" opacity="0.3" stroke="#60a5fa" stroke-width="3"/>
    <rect x="-70" y="0" width="60" height="50" rx="8" fill="#3b82f6" opacity="0.3" stroke="#60a5fa" stroke-width="3"/>
    <rect x="-5" y="0" width="60" height="50" rx="8" fill="#3b82f6" opacity="0.3" stroke="#60a5fa" stroke-width="3"/>
    <circle cx="-40" cy="-30" r="8" fill="#60a5fa" opacity="0.9"/>
    <path d="M-70,50 L-45,22 L-22,48 L-5,33 L35,50 L60,50 L60,0 L-5,0 Z" fill="#93c5fd" opacity="0.4"/>
  </g>

  ${
    hasPassword
      ? `<g transform="translate(${width / 2}, ${height / 2 - 155})">
           <circle cx="0" cy="0" r="18" fill="#f59e0b" opacity="0.35"/>
           <path d="M-10,0 L-10,12 Q-10,22 0,22 Q10,22 10,12 L10,0 Z" fill="#fbbf24" stroke="#fde68a" stroke-width="2"/>
           <path d="M-5,0 L-5,-8 Q-5,-13 0,-13 Q5,-13 5,-8 L5,0" fill="none" stroke="#fde68a" stroke-width="2.5" stroke-linecap="round"/>
         </g>`
      : ""
  }

  <!-- Albumname -->
  <text x="${width / 2}" y="${height / 2 + 65}"
        font-family="Arial, sans-serif" font-size="36" font-weight="bold"
        fill="#ffffff" text-anchor="middle">
    ${truncatedName}
  </text>

  <!-- Dateianzahl -->
  <text x="${width / 2}" y="${height / 2 + 110}"
        font-family="Arial, sans-serif" font-size="22"
        fill="#93c5fd" text-anchor="middle">
    ${fileCount} file${fileCount !== 1 ? "s" : ""}${hasPassword ? " &#183; Password Protected" : ""}
  </text>

  <!-- Uploader -->
  <text x="${width / 2}" y="${height - 40}"
        font-family="Arial, sans-serif" font-size="16"
        fill="#e2e8f0" text-anchor="middle">
    Shared by ${uploader} &#183; ${siteName}
  </text>
</svg>`;
}