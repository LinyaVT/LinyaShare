import { NextRequest, NextResponse } from "next/server"
import { getFileByShareId } from "@/lib/upload"
import bcrypt from "bcryptjs"
import { nodeStreamToWeb } from "@/lib/node-stream"
import { logStatEvent } from "@/lib/stats"
import { findFileOnDisk } from "@/lib/file-storage"
import { buildFileHeaders, buildContentDisposition } from "@/lib/file-security"
import fs from "fs"

export async function POST(request: NextRequest) {
  try {
    const { shareId, password } = await request.json()
    
    const file = await getFileByShareId(shareId)
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Check password if required
    if (file.password) {
      if (!password) {
        return NextResponse.json({ error: "Password required", needsPassword: true }, { status: 401 })
      }
      const valid = await bcrypt.compare(password, file.password)
      if (!valid) {
        return NextResponse.json({ error: "Invalid password" }, { status: 403 })
      }
    }

    // Find the file on disk (central path logic, incl. user folder)
    const filePath = findFileOnDisk(file)
    if (!filePath) {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
    }

    const stat = fs.statSync(filePath)
    
    // Increment download count (only for ACTIVE/claimed files)
    if (file.status !== 'IMPORT') {
      const { prisma } = await import("@/lib/prisma")
      await prisma.file.update({
        where: { id: file.id },
        data: { downloads: { increment: 1 } },
      })
    }

    // Log statistics event (fire-and-forget)
    logStatEvent("DOWNLOAD", { fileId: file.id, userId: file.userId || undefined, size: stat.size })

    // Downloads are always attachment
    const contentDisposition = buildContentDisposition(file.originalName, "attachment")

    // Stream the file
    // nodeStreamToWeb() instead of Readable.toWeb()/manual ReadableStream:
    // avoids the "Controller is already closed" uncaughtException bug
    // (nodejs/node#64529) when connections are aborted.
    const nodeStream = fs.createReadStream(filePath)
    const readableStream = nodeStreamToWeb(nodeStream)

    const headers = buildFileHeaders(
      file.type || "application/octet-stream",
      stat.size,
      contentDisposition
    )

    return new NextResponse(readableStream, { headers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}