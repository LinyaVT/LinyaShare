import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { removeFileFromDisk } from "@/lib/file-storage"

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
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      }

      updateData.password = await bcrypt.hash(newPassword, 12)
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userId = (session.user as any).id

    // Delete all files from disk (central path logic, incl. user folder)
    const files = await prisma.file.findMany({ where: { userId } })

    for (const file of files) {
      try {
        await removeFileFromDisk(file)
      } catch {}
    }

    // Delete user (cascades to files in DB)
    await prisma.user.delete({ where: { id: userId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 })
  }
}