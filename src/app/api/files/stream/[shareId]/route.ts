import { NextRequest, NextResponse } from "next/server"
import { getFileByShareId } from "@/lib/upload"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { UPLOAD_DIR, IMPORT_DIR } from "@/lib/constants"
import { Readable } from "stream"
import path from "path"
import fs from "fs"



export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params

    // Datei aus DB holen
    const file = await getFileByShareId(shareId)
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Passwort-Check: Überspringen wenn der aufgerufene User der Datei-Besitzer ist
    const session = await auth()
    const isOwner = session?.user && file.userId === (session.user as any).id

    if (file.password && !isOwner) {
      const password = request.nextUrl.searchParams.get("password")
      if (!password) {
        return NextResponse.json({ error: "Password required" }, { status: 401 })
      }
      const valid = await bcrypt.compare(password, file.password)
      if (!valid) {
        return NextResponse.json({ error: "Invalid password" }, { status: 403 })
      }
    }

    // Prüfen ob es ein Download ist
    const isDownload = request.nextUrl.searchParams.get("download") === "1"

    // Download-Counter erhöhen wenn Download (nur bei ACTIVE/claimed files)
    if (isDownload && file.status !== 'IMPORT') {
      const { prisma } = await import("@/lib/prisma")
      await prisma.file.update({
        where: { id: file.id },
        data: { downloads: { increment: 1 } },
      }).catch(() => {}) // Fehler ignorieren (non-critical)
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

    // Korrekten Dateinamen für Content-Disposition kodieren
    const encodedFilename = encodeURIComponent(file.originalName || file.name);
    const contentDisposition = isDownload
      ? `attachment; filename="${file.originalName || file.name}"; filename*=UTF-8''${encodedFilename}`
      : `inline; filename="${file.originalName || file.name}"; filename*=UTF-8''${encodedFilename}`;

    // Range-Request Support für echtes Video/Audio Streaming
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

    // 🔥 Readable.toWeb() nutzt automatische Backpressure
    // Der Node.js-Stream pausiert wenn der Web-Stream-Controller voll ist
    // highWaterMark auf 64KB reduziert für minimale RAM-Pufferung
    const nodeStream = fs.createReadStream(filePath, { start, end, highWaterMark: 64 * 1024 }) // 64KB chunks
    const readableStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>

    const headers: Record<string, string> = {
      "Content-Type": file.type || "application/octet-stream",
      "Content-Length": contentLength.toString(),
      "Content-Disposition": contentDisposition,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache, no-transform",
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
