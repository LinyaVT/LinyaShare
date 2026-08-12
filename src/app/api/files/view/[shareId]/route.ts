import { NextRequest, NextResponse } from "next/server"
import { getFileByShareId } from "@/lib/upload"
import { logStatEvent } from "@/lib/stats"

// Path-Sanitizing für shareId
function isValidShareId(shareId: string): boolean {
  // UUID-Format: nur alphanumerische Zeichen und Bindestriche
  return /^[a-zA-Z0-9-]+$/.test(shareId) && shareId.length >= 8 && shareId.length <= 50
}

// Erhöht den View-Counter einer Datei, wenn sie über die /s/-Share-Seite
// angesehen wird (Client-seitig nach dem Laden bzw. nach Passwort-Freigabe).
export async function POST(
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

    // View zählt nur bei ACTIVE/claimed files
    if (file.status !== 'IMPORT') {
      // Statistik-Event loggen (fire-and-forget)
      logStatEvent("VIEW", { fileId: file.id, userId: file.userId || undefined, size: file.size })

      const { prisma } = await import("@/lib/prisma")
      const updated = await prisma.file.update({
        where: { id: file.id },
        data: { views: { increment: 1 } },
        select: { views: true },
      }).catch(() => null) // Fehler ignorieren (non-critical)

      return NextResponse.json({ ok: true, views: updated?.views ?? file.views + 1 })
    }

    return NextResponse.json({ ok: true, views: file.views })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}