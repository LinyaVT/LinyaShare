import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: {
      id: true,
      name: true,
      email: true,
      maxSize: true,
      role: true,
    },
  })

  return NextResponse.json(user)
}

export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { name, currentPassword, newPassword } = await request.json()
    const userId = (session.user as any).id

    const updateData: any = {}
    if (name) updateData.name = name

    if (currentPassword && newPassword) {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const valid = await bcrypt.compare(currentPassword, user.password)
      if (!valid) {
        return NextResponse.json({ error: "Aktuelles Passwort ist falsch" }, { status: 400 })
      }

      updateData.password = await bcrypt.hash(newPassword, 12)
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Update fehlgeschlagen" }, { status: 500 })
  }
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userId = (session.user as any).id

    // Delete all files from disk
    const files = await prisma.file.findMany({ where: { userId } })
    const fs = await import("fs/promises")
    const path = await import("path")
    const { UPLOAD_DIR } = await import("@/lib/constants")

    for (const file of files) {
      try {
        await fs.unlink(path.resolve(UPLOAD_DIR, file.name))
      } catch {}
    }

    // Delete user (cascades to files in DB)
    await prisma.user.delete({ where: { id: userId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Löschen fehlgeschlagen" }, { status: 500 })
  }
}