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

    // Get the file from the DB
    const file = await getFileByShareId(shareId)
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Password check: skip if the calling user is the file owner
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

    // Check whether this is a download
    const isDownload = request.nextUrl.searchParams.get("download") === "1"

    // Increment download counter if download (only for ACTIVE/claimed files)
    if (isDownload && file.status !== 'IMPORT') {
      const { prisma } = await import("@/lib/prisma")
      await prisma.file.update({
        where: { id: file.id },
        data: { downloads: { increment: 1 } },
      }).catch(() => {}) // Ignore errors (non-critical)
    }

    // Find the file on disk (central path logic, incl. user folder)
    const filePath = findFileOnDisk(file)
    if (!filePath) {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
    }

    const stat = fs.statSync(filePath)
    const fileSize = stat.size

    // Log statistics event (fire-and-forget, only on download)
    if (isDownload && file.status !== 'IMPORT') {
      logStatEvent("DOWNLOAD", { fileId: file.id, userId: file.userId || undefined, size: fileSize })
    }

    // Content-Disposition: download → attachment, otherwise inline only for safe types
    const disposition = getDeliveryDisposition(
      file.type || "application/octet-stream",
      file.originalName || file.name,
      isDownload
    )
    const contentDisposition = buildContentDisposition(file.originalName || file.name, disposition)

    // Range request support for real video/audio streaming
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

    // Streaming with 64KB chunks and automatic backpressure.
    // nodeStreamToWeb() instead of Readable.toWeb() avoids the
    // "Controller is already closed" uncaughtException bug (nodejs/node#64529)
    // on aborted connections (HEAD, video seek, client disconnect).
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
