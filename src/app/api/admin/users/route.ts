import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { logStatEvent } from "@/lib/stats"

export async function GET() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      maxSize: true,
      _count: { select: { files: true } },
      createdAt: true,
    },
  })

  return NextResponse.json({ users })
}

export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { userId, name, role, maxSize } = await request.json()
    const updateData: any = {}

    if (name) updateData.name = name
    if (role) updateData.role = role
    if (maxSize) updateData.maxSize = parseInt(maxSize)

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Update fehlgeschlagen" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { userId } = await request.json()
    
    // Delete files from disk
    const files = await prisma.file.findMany({ where: { userId } })
    const fs = await import("fs/promises")
    const path = await import("path")
    const { UPLOAD_DIR } = await import("@/lib/constants")

    for (const file of files) {
      try {
        await fs.unlink(path.resolve(UPLOAD_DIR, file.name))
      } catch {}
    }

    await prisma.user.delete({ where: { id: userId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Löschen fehlgeschlagen" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { name, email, password, role, maxSize } = await request.json()

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "E-Mail existiert bereits" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "USER",
        maxSize: parseInt(maxSize) || 524288000,
      },
    })

    // Statistik-Event loggen (fire-and-forget)
    logStatEvent("REGISTER", { userId: user.id })

    return NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email } })
  } catch (error) {
    return NextResponse.json({ error: "Erstellung fehlgeschlagen" }, { status: 500 })
  }
}