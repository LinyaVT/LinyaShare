import { NextRequest, NextResponse } from "next/server"
import { getFileByShareId } from "@/lib/upload"
import bcrypt from "bcryptjs"

// Reine Passwort-Verifikation (kein Download, kein Counter-Inkrement).
// Wird von der Share-Seite aufgerufen, um die Vorschau zu entsperren,
// ohne den Download-Counter zu erhöhen.
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