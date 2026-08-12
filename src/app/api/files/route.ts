import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteFile } from "@/lib/upload"
import { MAX_EMBED_SIZE } from "@/lib/constants"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const files = await prisma.file.findMany({
    where: { userId: (session.user as any).id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      originalName: true,
      type: true,
      size: true,
      shareId: true,
      downloads: true,
      views: true,
      password: true,
      plainPassword: true,
      createdAt: true,
      embedUrl: true,
      isMediaEmbed: true,
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

  return NextResponse.json({
    files: files.map((f) => {
      // Direkter Media-Link mit Dateiendung (endet auf .mp4 etc.) für Discord & Co.
      // Nur für Dateien unter 50MB – größere Dateien bekommen keinen Embed-Link.
      const embedUrl = f.isMediaEmbed && !f.password && f.size < MAX_EMBED_SIZE
        ? `${baseUrl}/api/files/embed/${f.shareId}/${encodeURIComponent(f.originalName)}`
        : undefined

      return {
        ...f,
        hasPassword: !!f.password,
        password: f.plainPassword || undefined,
        shareUrl: `${baseUrl}/s/${f.shareId}`,
        embedUrl,
      }
    }),
  })
}

export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { fileId, password } = await request.json()
    
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    })

    if (!file || file.userId !== (session.user as any).id) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 12) : null
    const plainPassword = password || null
    
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: { password: hashedPassword, plainPassword: plainPassword },
    })

    return NextResponse.json({ 
      success: true,
      hasPassword: !!updatedFile.password
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { fileId, fileIds } = await request.json()
    const ids = fileIds && Array.isArray(fileIds) ? fileIds : fileId ? [fileId] : []

    if (ids.length === 0) {
      return NextResponse.json({ error: "No file IDs provided" }, { status: 400 })
    }

    const results = await Promise.allSettled(
      ids.map((id: string) => deleteFile(id, (session.user as any).id))
    )
    const deleted = results.filter((r) => r.status === "fulfilled").length

    return NextResponse.json({ success: deleted > 0, deleted })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}