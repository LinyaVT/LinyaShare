import { NextRequest, NextResponse } from "next/server";
import { getAlbumByShareId, verifyAlbumPassword } from "@/lib/albums";

export async function POST(request: NextRequest) {
  try {
    const { shareId, password } = await request.json();

    if (!shareId) {
      return NextResponse.json({ error: "Missing album id" }, { status: 400 });
    }

    const album = await getAlbumByShareId(shareId);
    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const valid = await verifyAlbumPassword(album, password || "");
    if (!valid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}