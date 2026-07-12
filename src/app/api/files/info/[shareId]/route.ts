import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params

  const file = await prisma.file.findUnique({
    where: { shareId },
    select: {
      id: true,
      originalName: true,
      type: true,
      size: true,
      downloads: true,
      password: true,
      user: {
        select: { name: true },
      },
    },
  })

  if (!file) {
    return NextResponse.json({ exists: false })
  }

  return NextResponse.json({
    exists: true,
    name: file.originalName,
    type: file.type,
    size: file.size,
    downloads: file.downloads,
    hasPassword: !!file.password,
    uploader: file.user.name,
  })
}