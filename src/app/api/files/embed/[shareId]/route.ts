import { NextRequest, NextResponse } from "next/server"
import { getFileByShareId } from "@/lib/upload"
import { UPLOAD_DIR, IMPORT_DIR } from "@/lib/constants"
import path from "path"
import fs from "fs"
import { Readable } from "stream"

// Path-Sanitizing für shareId
function isValidShareId(shareId: string): boolean {
  // UUID-Format: nur alphanumerische Zeichen und Bindestriche
  return /^[a-zA-Z0-9-]+$/.test(shareId) && shareId.length >= 8 && shareId.length <= 50
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
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

    // Prüfe ob es sich um einen unterstützten Medientyp handelt
    const mimeType = file.type || "application/octet-stream"
    const isVideo = mimeType.startsWith("video/") || /\.(mp4|webm|avi|mov|mkv|wmv|flv|m4v|mpg|mpeg|3gp)$/i.test(file.originalName || file.name)
    const isAudio = mimeType.startsWith("audio/") || /\.(mp3|wav|ogg|flac|aac|m4a|wma|opus)$/i.test(file.originalName || file.name)
    const isImage = mimeType.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif|heic)$/i.test(file.originalName || file.name)

    if (!isVideo && !isAudio && !isImage) {
      return NextResponse.json({ error: "Not a media file" }, { status: 400 })
    }

    // Datei auf Disk finden
    const uploadPath = path.resolve(UPLOAD_DIR, file.name);
    const importPath = path.resolve(IMPORT_DIR, file.name);

    let filePath: string;
    if (fs.existsSync(uploadPath)) {
      filePath = uploadPath;
    } else if (fs.existsSync(importPath)) {
      filePath = importPath;
    } else {
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

    // Streaming mit 64KB Chunks
    const nodeStream = fs.createReadStream(filePath, { start, end, highWaterMark: 64 * 1024 })
    const readableStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>

    // Embed: Immer inline liefern (wie public/ Datei)
    const encodedFilename = encodeURIComponent(file.originalName || file.name)
    const contentDisposition = `inline; filename="${file.originalName || file.name}"; filename*=UTF-8''${encodedFilename}`

    const headers: Record<string, string> = {
      "Content-Type": mimeType,
      "Content-Length": contentLength.toString(),
      "Content-Disposition": contentDisposition,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
    }

    if (rangeHeader) {
      headers["Content-Range"] = `bytes ${start}-${end}/${fileSize}`
    }

    return new NextResponse(readableStream, {
      status: statusCode,
      headers,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

