import { NextRequest, NextResponse } from "next/server"
import { getFileByShareId } from "@/lib/upload"
import { nodeStreamToWeb } from "@/lib/node-stream"
import { findFileOnDisk } from "@/lib/file-storage"
import { buildFileHeaders, buildContentDisposition, isSafeInlineType } from "@/lib/file-security"
import fs from "fs"

// Path-Sanitizing für shareId
function isValidShareId(shareId: string): boolean {
  // UUID-Format: nur alphanumerische Zeichen und Bindestriche
  return /^[a-zA-Z0-9-]+$/.test(shareId) && shareId.length >= 8 && shareId.length <= 50
}

// Der [filename]-Segment macht aus der URL einen "direkten Link",
// der mit der Dateiendung endet (z.B. .../embed/{shareId}/video.mp4).
// Discord & Co. erkennen Video-/Audio-/Bild-Dateien nur an solchen URLs.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string; filename: string }> }
) {
  try {
    const { shareId } = await params

    // Path-Sanitizing
    if (!isValidShareId(shareId)) {
      return NextResponse.json({ error: "Invalid share ID" }, { status: 400 })
    }

    // Datei aus DB holen
    const file = await getFileByShareId(shareId)
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Passwort-Check: Bei passwortgeschützten Dateien Embed nicht verfügbar
    const session = await import("@/lib/auth").then(m => m.auth())
    const isOwner = session?.user && file.userId === (session.user as any).id

    if (file.password && !isOwner) {
      return NextResponse.json({ error: "Password protected" }, { status: 401 })
    }

    const mimeType = file.type || "application/octet-stream"
    const rawName = file.originalName || file.name

    // Aktive Inhalte (SVG, HTML, JS, XML, etc.) nie als Embed ausliefern
    if (!isSafeInlineType(mimeType, rawName)) {
      return NextResponse.json({ error: "Blocked" }, { status: 403 })
    }

    // Datei auf Disk finden (zentrale Pfad-Logik, inkl. User-Ordner)
    const filePath = findFileOnDisk(file)
    if (!filePath) {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
    }

    const stat = fs.statSync(filePath)
    const fileSize = stat.size

    // Range-Request Support (für Video/Audio Streaming)
    const rangeHeader = request.headers.get("range")
    let start = 0
    let end = fileSize - 1
    let statusCode = 200

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-")
      start = parseInt(parts[0], 10)
      if (parts[1]) {
        end = parseInt(parts[1], 10)
      }
      statusCode = 206 // Partial Content
    }

    const contentLength = end - start + 1

    // Streaming mit 64KB Chunks.
    // nodeStreamToWeb() statt Readable.toWeb() vermeidet den
    // "Controller is already closed"-uncaughtException-Bug (nodejs/node#64529)
    // bei abgebrochenen Verbindungen (HEAD, Video-Seek, Client-Disconnect).
    const nodeStream = fs.createReadStream(filePath, { start, end, highWaterMark: 64 * 1024 })
    const readableStream = nodeStreamToWeb(nodeStream)

    // Embed: Nur sichere, verifizierte Typen werden inline ausgeliefert (isSafeInlineType oben geprüft)
    const contentDisposition = buildContentDisposition(rawName, "inline")

    const headers = buildFileHeaders(
      mimeType,
      contentLength,
      contentDisposition,
      {
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
        "Content-Security-Policy": "sandbox",
        ...(rangeHeader ? { "Content-Range": `bytes ${start}-${end}/${fileSize}` } : {}),
      }
    )

    return new NextResponse(readableStream, {
      status: statusCode,
      headers,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
