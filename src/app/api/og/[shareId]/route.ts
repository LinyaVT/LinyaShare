import { NextRequest, NextResponse } from "next/server"
import { getFileByShareId } from "@/lib/upload"
import { loadOgAccents, renderOgPng, ogOverlayRect } from "@/lib/og"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    // Strip the .png suffix (Discord & co. only show OG images with a file extension).
    // URLs without an extension remain compatible.
    const { shareId: rawId } = await params
    const shareId = rawId.replace(/\.png$/i, "")

    const file = await getFileByShareId(shareId)
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Load theme accent colors (already 30% darkened → better readability)
    const { accentFrom, accentTo, siteName } = await loadOgAccents()

    const fileName = file.originalName || file.name
    const fileType = file.type || ""
    const hasPassword = !!file.password
    const uploader = file.user?.name || "Unknown"

    // OG image size: 1200x630 (standard for Open Graph)
    const width = 1200
    const height = 630

    let svg = ""
    
    if (hasPassword) {
      // Password-protected: lock icon
      svg = generateLockedSvg(width, height, fileName, uploader, siteName, accentFrom, accentTo)
    } else {
      // File-type-based SVG
      const isImage = fileType.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(fileName)
      const isVideo = fileType.startsWith("video/") || /\.(mp4|webm|avi|mov|mkv|wmv)$/i.test(fileName)
      const isAudio = fileType.startsWith("audio/") || /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(fileName)

      if (isImage) {
        svg = generateImageSvg(width, height, fileName, uploader, siteName, accentFrom, accentTo)
      } else if (isVideo) {
        svg = generateVideoSvg(width, height, fileName, uploader, siteName, accentFrom, accentTo)
      } else if (isAudio) {
        svg = generateAudioSvg(width, height, fileName, uploader, siteName, accentFrom, accentTo)
      } else {
        svg = generateFileSvg(width, height, fileName, fileType, uploader, siteName, accentFrom, accentTo)
      }
    }

    // Rasterize SVG → PNG: Discord, Facebook & co. do not render SVG
    // in embeds, only jpg/png/gif/webp.
    const pngBuffer = await renderOgPng(svg)

    return new NextResponse(pngBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": pngBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generateLockedSvg(width: number, height: number, fileName: string, uploader: string, siteName: string, accentFrom: string, accentTo: string) {
  const truncatedName = fileName.length > 40 ? fileName.substring(0, 40) + "..." : fileName
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${accentFrom};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${accentTo};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  ${ogOverlayRect(width, height)}
  
  <!-- Lock icon -->
  <g transform="translate(${width/2}, ${height/2 - 50})" filter="url(#shadow)">
    <circle cx="0" cy="0" r="80" fill="#3b82f6" opacity="0.15"/>
    <circle cx="0" cy="0" r="60" fill="#3b82f6" opacity="0.25"/>
    <path d="M-30,-10 L-30,20 Q-30,35 -15,35 L15,35 Q30,35 30,20 L30,-10 Z" 
          fill="#3b82f6" stroke="#60a5fa" stroke-width="3"/>
    <path d="M-15,-10 L-15,-25 Q-15,-40 0,-40 Q15,-40 15,-25 L15,-10" 
          fill="none" stroke="#60a5fa" stroke-width="4" stroke-linecap="round"/>
    <circle cx="0" cy="20" r="8" fill="#60a5fa"/>
    <rect x="-2" y="20" width="4" height="12" fill="#60a5fa"/>
  </g>
  
  <!-- File name -->
  <text x="${width/2}" y="${height/2 + 60}" 
        font-family="Arial, sans-serif" font-size="32" font-weight="bold" 
        fill="#ffffff" text-anchor="middle">
    ${truncatedName}
  </text>
  
  <!-- Password hint -->
  <text x="${width/2}" y="${height/2 + 110}" 
        font-family="Arial, sans-serif" font-size="20" 
        fill="#94a3b8" text-anchor="middle">
    Password Protected
  </text>
  
  <!-- Uploader -->
  <text x="${width/2}" y="${height - 40}" 
        font-family="Arial, sans-serif" font-size="16" 
        fill="#64748b" text-anchor="middle">
    Shared by ${uploader} &#183; ${siteName}
  </text>
</svg>`
}

function generateImageSvg(width: number, height: number, fileName: string, uploader: string, siteName: string, accentFrom: string, accentTo: string) {
  const truncatedName = fileName.length > 35 ? fileName.substring(0, 35) + "..." : fileName
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${accentFrom};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${accentTo};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  ${ogOverlayRect(width, height)}
  
  <!-- Image icon -->
  <g transform="translate(${width/2}, ${height/2 - 60})">
    <rect x="-70" y="-50" width="140" height="100" rx="10" 
          fill="#3b82f6" opacity="0.3" stroke="#60a5fa" stroke-width="3"/>
    <circle cx="-25" cy="-15" r="15" fill="#60a5fa" opacity="0.8"/>
    <path d="M-70,20 L-30,-20 L0,10 L40,-30 L70,30 L70,50 L-70,50 Z" 
          fill="#93c5fd" opacity="0.4"/>
  </g>
  
  <!-- File name -->
  <text x="${width/2}" y="${height/2 + 50}" 
        font-family="Arial, sans-serif" font-size="36" font-weight="bold" 
        fill="#ffffff" text-anchor="middle">
    ${truncatedName}
  </text>
  
  <!-- Type -->
  <text x="${width/2}" y="${height/2 + 95}" 
        font-family="Arial, sans-serif" font-size="22" 
        fill="#93c5fd" text-anchor="middle">
    Image File
  </text>
  
  <!-- Uploader -->
  <text x="${width/2}" y="${height - 40}" 
        font-family="Arial, sans-serif" font-size="16" 
        fill="#64748b" text-anchor="middle">
    Shared by ${uploader} &#183; ${siteName}
  </text>
</svg>`
}

function generateVideoSvg(width: number, height: number, fileName: string, uploader: string, siteName: string, accentFrom: string, accentTo: string) {
  const truncatedName = fileName.length > 35 ? fileName.substring(0, 35) + "..." : fileName
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${accentFrom};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${accentTo};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  ${ogOverlayRect(width, height)}
  
  <!-- Video icon -->
  <g transform="translate(${width/2}, ${height/2 - 60})">
    <rect x="-70" y="-50" width="140" height="100" rx="10" 
          fill="#a855f7" opacity="0.3" stroke="#c084fc" stroke-width="3"/>
    <path d="M-30,-30 L30,0 L-30,30 Z" fill="#c084fc"/>
  </g>
  
  <!-- File name -->
  <text x="${width/2}" y="${height/2 + 50}" 
        font-family="Arial, sans-serif" font-size="36" font-weight="bold" 
        fill="#ffffff" text-anchor="middle">
    ${truncatedName}
  </text>
  
  <!-- Type -->
  <text x="${width/2}" y="${height/2 + 95}" 
        font-family="Arial, sans-serif" font-size="22" 
        fill="#c084fc" text-anchor="middle">
    Video File
  </text>
  
  <!-- Uploader -->
  <text x="${width/2}" y="${height - 40}" 
        font-family="Arial, sans-serif" font-size="16" 
        fill="#64748b" text-anchor="middle">
    Shared by ${uploader} &#183; ${siteName}
  </text>
</svg>`
}

function generateAudioSvg(width: number, height: number, fileName: string, uploader: string, siteName: string, accentFrom: string, accentTo: string) {
  const truncatedName = fileName.length > 35 ? fileName.substring(0, 35) + "..." : fileName
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${accentFrom};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${accentTo};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  ${ogOverlayRect(width, height)}
  
  <!-- Audio icon with waveform -->
  <g transform="translate(${width/2}, ${height/2 - 60})">
    <!-- Headphones -->
    <path d="M-20,-20 Q-20,-50 0,-50 Q20,-50 20,-20" 
          fill="none" stroke="#34d399" stroke-width="4" stroke-linecap="round"/>
    <rect x="-25" y="-20" width="10" height="25" rx="3" fill="#34d399"/>
    <rect x="15" y="-20" width="10" height="25" rx="3" fill="#34d399"/>
    
    <!-- Waveform -->
    <rect x="-50" y="25" width="8" height="20" fill="#34d399" opacity="0.7"/>
    <rect x="-35" y="15" width="8" height="40" fill="#34d399" opacity="0.8"/>
    <rect x="-20" y="5" width="8" height="60" fill="#34d399"/>
    <rect x="-5" y="20" width="8" height="30" fill="#34d399" opacity="0.9"/>
    <rect x="10" y="10" width="8" height="50" fill="#34d399" opacity="0.8"/>
    <rect x="25" y="25" width="8" height="20" fill="#34d399" opacity="0.7"/>
  </g>
  
  <!-- File name -->
  <text x="${width/2}" y="${height/2 + 50}" 
        font-family="Arial, sans-serif" font-size="36" font-weight="bold" 
        fill="#ffffff" text-anchor="middle">
    ${truncatedName}
  </text>
  
  <!-- Type -->
  <text x="${width/2}" y="${height/2 + 95}" 
        font-family="Arial, sans-serif" font-size="22" 
        fill="#34d399" text-anchor="middle">
    Audio File
  </text>
  
  <!-- Uploader -->
  <text x="${width/2}" y="${height - 40}" 
        font-family="Arial, sans-serif" font-size="16" 
        fill="#64748b" text-anchor="middle">
    Shared by ${uploader} &#183; ${siteName}
  </text>
</svg>`
}

function generateFileSvg(width: number, height: number, fileName: string, fileType: string, uploader: string, siteName: string, accentFrom: string, accentTo: string) {
  const truncatedName = fileName.length > 35 ? fileName.substring(0, 35) + "..." : fileName
  
  // Determine the color based on the file type
  let primaryColor = "#64748b" // Default gray
  if (fileType.includes("archive") || /\.(zip|rar|tar|gz|7z)$/i.test(fileName)) {
    primaryColor = "#fbbf24" // Yellow for archives
  } else if (fileType.includes("text") || /\.(txt|md|doc|pdf)$/i.test(fileName)) {
    primaryColor = "#3b82f6" // Blue for documents
  } else if (fileType.includes("spreadsheet") || /\.(xls|csv)$/i.test(fileName)) {
    primaryColor = "#22c55e" // Green for spreadsheets
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${accentFrom};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${accentTo};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  ${ogOverlayRect(width, height)}
  
  <!-- File icon -->
  <g transform="translate(${width/2}, ${height/2 - 60})">
    <rect x="-50" y="-60" width="100" height="120" rx="8" 
          fill="${primaryColor}" opacity="0.2" stroke="${primaryColor}" stroke-width="3"/>
    <path d="M-50,-40 L0,-40 L20,-20 L50,-20 L50,60 L-50,60 Z" 
          fill="${primaryColor}" opacity="0.4"/>
    <path d="M20,-20 L20,0 L50,0" fill="none" stroke="${primaryColor}" stroke-width="3" opacity="0.6"/>
  </g>
  
  <!-- File name -->
  <text x="${width/2}" y="${height/2 + 50}" 
        font-family="Arial, sans-serif" font-size="36" font-weight="bold" 
        fill="#ffffff" text-anchor="middle">
    ${truncatedName}
  </text>
  
  <!-- Type -->
  <text x="${width/2}" y="${height/2 + 95}" 
        font-family="Arial, sans-serif" font-size="22" 
        fill="#94a3b8" text-anchor="middle">
    File
  </text>
  
  <!-- Uploader -->
  <text x="${width/2}" y="${height - 40}" 
        font-family="Arial, sans-serif" font-size="16" 
        fill="#64748b" text-anchor="middle">
    Shared by ${uploader}
  </text>
</svg>`
}