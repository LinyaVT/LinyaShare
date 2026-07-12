import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const files = await prisma.file.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  })

  return NextResponse.json({ files })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { fileId } = await request.json()
    
    const file = await prisma.file.findUnique({ where: { id: fileId } })
    if (!file) {
      return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 })
    }

    // Delete from disk
    const fs = await import("fs/promises")
    const path = await import("path")
    const { UPLOAD_DIR } = await import("@/lib/constants")
    try {
      await fs.unlink(path.resolve(UPLOAD_DIR, file.name))
    } catch {}

    await prisma.file.delete({ where: { id: fileId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Löschen fehlgeschlagen" }, { status: 500 })
  }
}