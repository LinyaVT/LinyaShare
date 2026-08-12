import { NextRequest, NextResponse } from "next/server"
import { getFileByShareId } from "@/lib/upload"
import bcrypt from "bcryptjs"
import { UPLOAD_DIR, IMPORT_DIR } from "@/lib/constants"
import { nodeStreamToWeb } from "@/lib/node-stream"
import { logStatEvent } from "@/lib/stats"
import path from "path"
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

    // Datei in /data/uploads oder /data/import suchen
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
    
    // Increment download count (nur bei ACTIVE/claimed files)
    if (file.status !== 'IMPORT') {
      const { prisma } = await import("@/lib/prisma")
      await prisma.file.update({
        where: { id: file.id },
        data: { downloads: { increment: 1 } },
      })
    }

    // Statistik-Event loggen (fire-and-forget)
    logStatEvent("DOWNLOAD", { fileId: file.id, userId: file.userId || undefined, size: stat.size })

    // Korrekten Dateinamen für Content-Disposition kodieren
    const encodedFilename = encodeURIComponent(file.originalName);
    const contentDisposition = `attachment; filename="${file.originalName}"; filename*=UTF-8''${encodedFilename}`;

    // Stream the file
    // nodeStreamToWeb() statt Readable.toWeb()/manuellem ReadableStream:
    // vermeidet den "Controller is already closed"-uncaughtException-Bug
    // (nodejs/node#64529) bei abgebrochenen Verbindungen.
    const nodeStream = fs.createReadStream(filePath)
    const readableStream = nodeStreamToWeb(nodeStream)

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "Content-Disposition": contentDisposition,
        "Content-Length": stat.size.toString(),
        "Accept-Ranges": "bytes",
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}