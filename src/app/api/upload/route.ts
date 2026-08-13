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
  const password = request.headers.get("x-password") || undefined; // 👈 password from header

  if (!uploadId || !filename) {
    return NextResponse.json({ error: "Missing upload metadata" }, { status: 400 });
  }

  try {
    const nodeStream = Readable.fromWeb(request.body as any);

    // 👇 DECISION: Logged-in user → /data/uploads, otherwise → /data/import
    const targetDir = isAuthenticated ? 'uploads' : 'import';

    // Always write the chunk first
    await saveFileChunk(nodeStream, chunkIndex, uploadId, targetDir);

    // If last chunk: finalize
    if (isFinal) {
      if (isAuthenticated && userId) {
        // User upload → /data/uploads + ACTIVE (incl. password!)
        const fileRecord = await finalizeUserUpload(
          uploadId,
          filename,
          mimeType || "application/octet-stream",
          userId,
          password // 👈 password is passed to the upload
        );
        return NextResponse.json({ success: true, file: fileRecord });
      } else {
        // Admin import (no session user) → /data/import + IMPORT
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