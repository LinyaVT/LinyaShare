import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteFile } from "@/lib/upload"
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
      password: true,
      plainPassword: true,
      createdAt: true,
      embedUrl: true,
      isMediaEmbed: true,
    },
  })

  return NextResponse.json({
    files: files.map((f) => ({
      ...f,
      hasPassword: !!f.password,
      password: f.plainPassword || undefined,
      shareUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/s/${f.shareId}`,
      embedUrl: f.password ? undefined : (f.embedUrl || undefined),
    })),
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
    const { fileId } = await request.json()
    await deleteFile(fileId, (session.user as any).id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}