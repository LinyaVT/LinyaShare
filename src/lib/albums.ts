import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { findFileOnDisk } from "@/lib/file-storage";
import { buildContentDisposition } from "@/lib/file-security";

// ──────────────────────────────────────────────────────────
// URL HELPERS
// ──────────────────────────────────────────────────────────
export function getAlbumShareUrl(shareId: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl}/a/${shareId}`;
}

// ──────────────────────────────────────────────────────────
// CREATE
// ──────────────────────────────────────────────────────────
export async function createAlbum({
  name,
  description,
  userId,
  password,
  fileIds,
}: {
  name: string;
  description?: string;
  userId: string;
  password?: string;
  fileIds: string[];
}) {
  // Nur Dateien verwenden, die dem User gehören und aktiv sind
  const ownedFiles = await prisma.file.findMany({
    where: { id: { in: fileIds }, userId, status: "ACTIVE" },
    select: { id: true },
  });

  if (ownedFiles.length === 0) {
    throw new Error("No valid files selected");
  }

  const hashedPassword = password ? await bcrypt.hash(password, 12) : undefined;
  const shareId = uuidv4();

  return prisma.album.create({
    data: {
      shareId,
      name,
      description: description || null,
      password: hashedPassword || null,
      plainPassword: password || null,
      userId,
      items: {
        create: ownedFiles.map((f) => ({ fileId: f.id })),
      },
    },
    include: {
      items: { include: { file: true } },
    },
  });
}

// ──────────────────────────────────────────────────────────
// GET
// ──────────────────────────────────────────────────────────
export async function getAlbumByShareId(shareId: string) {
  return prisma.album.findUnique({
    where: { shareId },
    include: {
      user: { select: { name: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          file: {
            select: {
              id: true,
              name: true,
              userId: true,
              shareId: true,
              originalName: true,
              type: true,
              size: true,
              password: true,
              downloads: true,
              views: true,
              createdAt: true,
              embedUrl: true,
              isMediaEmbed: true,
            },
          },
        },
      },
    },
  });
}

export async function getUserAlbums(userId: string) {
  return prisma.album.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          file: {
            select: {
              id: true,
              shareId: true,
              originalName: true,
              type: true,
              size: true,
              password: true,
              embedUrl: true,
              isMediaEmbed: true,
            },
          },
        },
      },
    },
  });
}

// ──────────────────────────────────────────────────────────
// UPDATE (Owner only)
// ──────────────────────────────────────────────────────────
export async function updateAlbum(
  shareId: string,
  userId: string,
  data: {
    name?: string;
    description?: string | null;
    password?: string | null;
    addFileIds?: string[];
    removeFileIds?: string[];
  }
) {
  const album = await prisma.album.findUnique({ where: { shareId } });
  if (!album || album.userId !== userId) {
    throw new Error("Album not found");
  }

  let password: string | null | undefined = undefined;
  let plainPassword: string | null | undefined = undefined;
  if (data.password !== undefined) {
    plainPassword = data.password || null;
    password = plainPassword ? await bcrypt.hash(plainPassword, 12) : null;
  }

  const itemsData: { create?: { fileId: string }[]; deleteMany?: { fileId: { in: string[] } } } = {};

  if (data.addFileIds?.length) {
    const ownedFiles = await prisma.file.findMany({
      where: { id: { in: data.addFileIds }, userId, status: "ACTIVE" },
      select: { id: true },
    });
    itemsData.create = ownedFiles.map((f) => ({ fileId: f.id }));
  }

  if (data.removeFileIds?.length) {
    itemsData.deleteMany = { fileId: { in: data.removeFileIds } };
  }

  return prisma.album.update({
    where: { id: album.id },
    data: {
      name: data.name ?? undefined,
      description: data.description !== undefined ? data.description : undefined,
      password,
      plainPassword,
      ...(Object.keys(itemsData).length ? { items: itemsData } : {}),
    },
    include: {
      items: { include: { file: true } },
    },
  });
}

// ──────────────────────────────────────────────────────────
// DELETE (Owner only)
// ──────────────────────────────────────────────────────────
export async function deleteAlbum(shareId: string, userId: string) {
  const album = await prisma.album.findUnique({ where: { shareId } });
  if (!album || album.userId !== userId) {
    throw new Error("Album not found");
  }
  await prisma.album.delete({ where: { id: album.id } });
  return { success: true };
}

// ──────────────────────────────────────────────────────────
// PASSWORD VERIFY
// ──────────────────────────────────────────────────────────
export async function verifyAlbumPassword(
  album: { password: string | null },
  password: string
): Promise<boolean> {
  if (!album.password) return true;
  return bcrypt.compare(password || "", album.password);
}

// ──────────────────────────────────────────────────────────
// VIEWS / DOWNLOADS COUNTERS
// ──────────────────────────────────────────────────────────
export async function incrementAlbumViews(shareId: string) {
  return prisma.album
    .update({ where: { shareId }, data: { views: { increment: 1 } } })
    .catch(() => null);
}

export async function incrementAlbumDownloads(shareId: string) {
  return prisma.album
    .update({ where: { shareId }, data: { downloads: { increment: 1 } } })
    .catch(() => null);
}

// ──────────────────────────────────────────────────────────
// ZIP DOWNLOAD (Streaming) — ZIPP-ENTRIES
// ──────────────────────────────────────────────────────────
export type ZipEntry = {
  fileId: string;
  originalName: string;
  filePath: string;
  size: number;
};

/**
 * Liefert die Dateien, die in den "Download all"-ZIP gehören:
 * Alle öffentlich zugänglichen Dateien (ohne eigenes Passwort),
 * deren Datei auf der Platte existiert. Dateien mit eigenem Passwort
 * werden ausgelassen (können nur einzeln freigeschaltet werden).
 */
export function getAlbumZipEntries(album: {
  shareId: string;
  items: { file: { id: string; originalName: string; type: string; size: number; password: string | null } }[];
}): ZipEntry[] {
  const entries: ZipEntry[] = [];

  for (const item of album.items) {
    if (item.file.password) continue; // einzeln geschützt → nicht im ZIP
    const filePath = findFileOnDisk(item.file as any);
    if (!filePath) continue;
    entries.push({
      fileId: item.file.id,
      originalName: item.file.originalName,
      filePath,
      size: item.file.size,
    });
  }

  return entries;
}

/**
 * Content-Disposition für den ZIP-Download: Dateiname = Album-Name.
 */
export function buildZipDisposition(albumName: string): string {
  const safeName = `${albumName.replace(/[^\w.\-() ]+/g, "").replace(/\s+/g, " ").trim() || "album"}.zip`;
  return buildContentDisposition(safeName, "attachment");
}