import { NextRequest, NextResponse } from "next/server"
import { getFileByShareId } from "@/lib/upload"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { nodeStreamToWeb } from "@/lib/node-stream"
import { logStatEvent } from "@/lib/stats"
import { findFileOnDisk } from "@/lib/file-storage"
import { buildFileHeaders, buildContentDisposition, getDeliveryDisposition } from "@/lib/file-security"
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

    // Datei auf Disk finden (zentrale Pfad-Logik, inkl. User-Ordner)
    const filePath = findFileOnDisk(file)
    if (!filePath) {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
    }

    const stat = fs.statSync(filePath)
    const fileSize = stat.size

    // Statistik-Event loggen (fire-and-forget, nur bei Download)
    if (isDownload && file.status !== 'IMPORT') {
      logStatEvent("DOWNLOAD", { fileId: file.id, userId: file.userId || undefined, size: fileSize })
    }

    // Content-Disposition: Download → attachment, sonst nur inline wenn sicherer Typ
    const disposition = getDeliveryDisposition(
      file.type || "application/octet-stream",
      file.originalName || file.name,
      isDownload
    )
    const contentDisposition = buildContentDisposition(file.originalName || file.name, disposition)

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

    // Streaming mit 64KB Chunks und automatischer Backpressure.
    // nodeStreamToWeb() statt Readable.toWeb() vermeidet den
    // "Controller is already closed"-uncaughtException-Bug (nodejs/node#64529)
    // bei abgebrochenen Verbindungen (HEAD, Video-Seek, Client-Disconnect).
    const nodeStream = fs.createReadStream(filePath, { start, end, highWaterMark: 64 * 1024 }) // 64KB chunks
    const readableStream = nodeStreamToWeb(nodeStream)

    const headers = buildFileHeaders(
      file.type || "application/octet-stream",
      contentLength,
      contentDisposition,
      {
        "Cache-Control": "no-cache, no-transform",
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
