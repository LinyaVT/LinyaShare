import { NextRequest, NextResponse } from "next/server";
import { saveFileChunk, finalizeUserUpload, finalizeImportUpload } from "@/lib/upload";
import { auth } from "@/lib/auth";
import { Readable } from "stream";

export async function POST(request: NextRequest) {
  const session = await auth();
  const isAuthenticated = !!session?.user;
  const userId = (session?.user as any)?.id;

  const uploadId = request.headers.get("x-upload-id");
  const chunkIndex = parseInt(request.headers.get("x-chunk-index") || "0");
  const isFinal = request.headers.get("x-is-final") === "true";
  const filename = request.headers.get("x-filename");
  const mimeType = request.headers.get("x-mime-type");
  const password = request.headers.get("x-password") || undefined; // 👈 Passwort aus Header

  if (!uploadId || !filename) {
    return NextResponse.json({ error: "Missing upload metadata" }, { status: 400 });
  }

  try {
    const nodeStream = Readable.fromWeb(request.body as any);

    // 👇 ENTSCHEIDUNG: Eingeloggter User → /data/uploads, Sonst → /data/import
    const targetDir = isAuthenticated ? 'uploads' : 'import';

    // Immer zuerst den Chunk schreiben
    await saveFileChunk(nodeStream, chunkIndex, uploadId, targetDir);

    // Wenn letzter Chunk: finalisieren
    if (isFinal) {
      if (isAuthenticated && userId) {
        // User-Upload → /data/uploads + ACTIVE (inkl. Passwort!)
        const fileRecord = await finalizeUserUpload(
          uploadId,
          filename,
          mimeType || "application/octet-stream",
          userId,
          password // 👈 Passwort wird an den Upload übergeben
        );
        return NextResponse.json({ success: true, file: fileRecord });
      } else {
        // Admin-Import (kein Session-User) → /data/import + IMPORT
        const fileRecord = await finalizeImportUpload(
          uploadId,
          filename,
          mimeType || "application/octet-stream"
        );
        return NextResponse.json({ success: true, file: fileRecord });
      }
    }

    return NextResponse.json({ success: true, message: "Chunk received" });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}