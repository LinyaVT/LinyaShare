import { NextRequest, NextResponse } from "next/server"
import { getFileByShareId } from "@/lib/upload"
import bcrypt from "bcryptjs"

// Pure password verification (no download, no counter increment).
// Called by the share page to unlock the preview
// without increasing the download counter.
export async function POST(request: NextRequest) {
  try {
    const { shareId, password } = await request.json()

    const file = await getFileByShareId(shareId)
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    if (file.password) {
      if (!password) {
        return NextResponse.json({ error: "Password required", needsPassword: true }, { status: 401 })
      }
      const valid = await bcrypt.compare(password, file.password)
      if (!valid) {
        return NextResponse.json({ error: "Invalid password" }, { status: 403 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}