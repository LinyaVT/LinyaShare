import { NextRequest, NextResponse } from "next/server"
import { getFileByShareId } from "@/lib/upload"
import { nodeStreamToWeb } from "@/lib/node-stream"
import { findFileOnDisk } from "@/lib/file-storage"
import { buildFileHeaders, buildContentDisposition, isSafeInlineType } from "@/lib/file-security"
import fs from "fs"

// Path sanitization for shareId
function isValidShareId(shareId: string): boolean {
  // UUID format: only alphanumeric characters and hyphens
  return /^[a-zA-Z0-9-]+$/.test(shareId) && shareId.length >= 8 && shareId.length <= 50
}

// The [filename] segment turns the URL into a "direct link"
// that ends with the file extension (e.g. .../embed/{shareId}/video.mp4).
// Discord & co. only recognize video/audio/image files by such URLs.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string; filename: string }> }
) {
  try {
    const { shareId } = await params

    // Path sanitization
    if (!isValidShareId(shareId)) {
      return NextResponse.json({ error: "Invalid share ID" }, { status: 400 })
    }

    // Get the file from the DB
    const file = await getFileByShareId(shareId)
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Password check: embed not available for password-protected files
    const session = await import("@/lib/auth").then(m => m.auth())
    const isOwner = session?.user && file.userId === (session.user as any).id

    if (file.password && !isOwner) {
      return NextResponse.json({ error: "Password protected" }, { status: 401 })
    }

    const mimeType = file.type || "application/octet-stream"
    const rawName = file.originalName || file.name

    // Never deliver active content (SVG, HTML, JS, XML, etc.) as embed
    if (!isSafeInlineType(mimeType, rawName)) {
      return NextResponse.json({ error: "Blocked" }, { status: 403 })
    }

    // Find the file on disk (central path logic, incl. user folder)
    const filePath = findFileOnDisk(file)
    if (!filePath) {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
    }

    const stat = fs.statSync(filePath)
    const fileSize = stat.size

    // Range request support (for video/audio streaming)
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

    // Streaming with 64KB chunks.
    // nodeStreamToWeb() instead of Readable.toWeb() avoids the
    // "Controller is already closed" uncaughtException bug (nodejs/node#64529)
    // on aborted connections (HEAD, video seek, client disconnect).
    const nodeStream = fs.createReadStream(filePath, { start, end, highWaterMark: 64 * 1024 })
    const readableStream = nodeStreamToWeb(nodeStream)

    // Embed: only safe, verified types are delivered inline (isSafeInlineType checked above)
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
