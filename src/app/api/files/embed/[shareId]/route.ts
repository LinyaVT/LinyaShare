import { NextRequest, NextResponse } from "next/server"
import { getFileByShareId } from "@/lib/upload"

// Path-Sanitizing für shareId
function isValidShareId(shareId: string): boolean {
  // UUID-Format: nur alphanumerische Zeichen und Bindestriche
  return /^[a-zA-Z0-9-]+$/.test(shareId) && shareId.length >= 8 && shareId.length <= 50
}

// Alte Embed-URL (ohne Dateiname) → auf die neue "direkte" URL mit Dateiendung
// umleiten, damit Crawler (Discord etc.) sie als Media-Datei erkennen.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params

    if (!isValidShareId(shareId)) {
      return NextResponse.json({ error: "Invalid share ID" }, { status: 400 })
    }

    const file = await getFileByShareId(shareId)
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Passwort-Check: Bei passwortgeschützten Dateien Embed nicht verfügbar
    const session = await import("@/lib/auth").then(m => m.auth())
    const isOwner = session?.user && file.userId === (session.user as any).id

    if (file.password && !isOwner) {
      return NextResponse.json({ error: "Password protected" }, { status: 401 })
    }

    const encodedFilename = encodeURIComponent(file.originalName || file.name)
    const redirectUrl = new URL(`/api/files/embed/${shareId}/${encodedFilename}`, request.url).toString()

    return NextResponse.redirect(redirectUrl, { status: 308 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
