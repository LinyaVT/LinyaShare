import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUnclaimedFiles, claimFile, claimOrphanedFile, deleteFile, deleteOrphanedFile } from "@/lib/upload"

export async function GET() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await getUnclaimedFiles()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Failed to fetch unclaimed files:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { fileId, fileName, userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    if (fileId) {
      // Assign the existing DB import entry
      const file = await claimFile(fileId, userId)
      return NextResponse.json({ success: true, file })
    } else if (fileName) {
      // Assign orphaned disk file (new DB entry)
      const file = await claimOrphanedFile(fileName, userId)
      return NextResponse.json({ success: true, file })
    } else {
      return NextResponse.json({ error: "fileId or fileName is required" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Claim file failed:", error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { fileId, fileName } = await request.json()

    if (fileId) {
      // Delete the DB entry (with disk cleanup)
      await deleteFile(fileId)
    } else if (fileName) {
      // Only delete the orphaned file on disk
      await deleteOrphanedFile(fileName)
    } else {
      return NextResponse.json({ error: "fileId or fileName required" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Delete failed:", error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}