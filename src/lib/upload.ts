import { pipeline } from 'stream/promises';
import { mkdir, rename, unlink, stat, readdir } from 'fs/promises';
import { existsSync, createWriteStream } from 'fs';
import { Readable } from 'stream';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { generateEmbedUrl, isSupportedMediaType } from './embed-generator';
import { logStatEvent } from './stats';

// Extended File types for embed fields
type FileWithEmbed = {
  id: string;
  shareId: string;
  name: string;
  originalName: string;
  type: string;
  size: number;
  password: string | null;
  plainPassword: string | null;
  userId: string | null;
  downloads: number;
  status: string;
  createdAt: Date;
  embedUrl?: string | null;
  isMediaEmbed?: boolean | null;
}

import { UPLOAD_DIR, IMPORT_DIR } from './constants'
import { getMimeTypeFromExtension } from './utils'


// ──────────────────────────────────────────────────────────
// PATH TRAVERSAL PROTECTION
// ──────────────────────────────────────────────────────────
/**
 * Creates a safe disk filename (UUID + Extension).
 * Spaces → _, special characters removed.
 */
function sanitizeFileName(fileName: string): string {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  const safeBase = base
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 100);
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '').substring(0, 20);
  return safeBase + safeExt;
}

async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

// ──────────────────────────────────────────────────────────
// CHUNK WRITING
// ──────────────────────────────────────────────────────────
export async function saveFileChunk(
  stream: Readable,
  chunkIndex: number,
  uploadId: string,
  targetDir: 'uploads' | 'import' = 'import'
) {
  const baseDir = targetDir === 'uploads' ? UPLOAD_DIR : IMPORT_DIR;
  await ensureDir(baseDir);

  const filePath = path.join(baseDir, `${uploadId}.tmp`);
  const flags = chunkIndex === 0 ? 'w' : 'a';

  try {
    await pipeline(stream, createWriteStream(filePath, { flags }));
  } catch (error: any) {
    console.error(`Chunk ${chunkIndex} write error:`, error);
    throw new Error(`Failed to write chunk ${chunkIndex}: ${error.message}`);
  }
}

// ──────────────────────────────────────────────────────────
// FINALIZE: User Upload → /data/uploads + status ACTIVE
// ──────────────────────────────────────────────────────────
export async function finalizeUserUpload(
  uploadId: string,
  originalName: string,
  mimeType: string,
  userId: string,
  password?: string
) {
  await ensureDir(UPLOAD_DIR);

  // Only sanitize the disk filename, originalName stays readable
  const safeDiskName = sanitizeFileName(originalName);
  const tempPath = path.join(UPLOAD_DIR, `${uploadId}.tmp`);
  const finalName = `${uuidv4()}${path.extname(safeDiskName)}`;
  const finalPath = path.join(UPLOAD_DIR, finalName);

  if (!existsSync(tempPath)) {
    throw new Error(`Upload incomplete: temporary file not found. Please try again.`);
  }

  await rename(tempPath, finalPath);
  const stats = await stat(finalPath);

  // Check user storage limit
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { files: true },
  });

  if (!user) throw new Error('User not found');

  const totalUsed = user.files.reduce((sum, f) => sum + f.size, 0);
  if (totalUsed + stats.size > (user.maxSize || 0)) {
    await unlink(finalPath).catch(() => {});
    throw new Error('Storage limit exceeded');
  }

  // Hash password if provided
  const hashedPassword = password ? await bcrypt.hash(password, 12) : undefined;

  const shareId = uuidv4();
  const isMedia = isSupportedMediaType(mimeType, originalName);
  const embedUrl = isMedia ? generateEmbedUrl(shareId, originalName) : null;

  const record = await prisma.file.create({
    data: {
      name: finalName,
      originalName, // originalName stays UNCHANGED (spaces, umlauts, etc.)
      type: mimeType || 'application/octet-stream',
      size: stats.size,
      shareId,
      userId,
      password: hashedPassword || null,
      plainPassword: password || null,
      status: 'ACTIVE',
      embedUrl,
      isMediaEmbed: isMedia,
    },
  });

  // Statistik-Event loggen (fire-and-forget)
  logStatEvent("UPLOAD", { fileId: record.id, userId, size: record.size });

  return record;
}

// ──────────────────────────────────────────────────────────
// FINALIZE: Import (Admin) → /data/import + status IMPORT
// ──────────────────────────────────────────────────────────
export async function finalizeImportUpload(
  uploadId: string,
  originalName: string,
  mimeType: string,
  userId?: string
) {
  await ensureDir(IMPORT_DIR);

  const safeDiskName = sanitizeFileName(originalName);
  const tempPath = path.join(IMPORT_DIR, `${uploadId}.tmp`);
  const finalName = `${uuidv4()}${path.extname(safeDiskName)}`;
  const finalPath = path.join(IMPORT_DIR, finalName);

  if (!existsSync(tempPath)) {
    throw new Error(`Upload incomplete: temporary file not found. Please try again.`);
  }

  await rename(tempPath, finalPath);
  const stats = await stat(finalPath);

  const shareId = uuidv4();
  const isMedia = isSupportedMediaType(mimeType, originalName);
  const embedUrl = isMedia ? generateEmbedUrl(shareId, originalName) : null;

  const record = await prisma.file.create({
    data: {
      name: finalName,
      originalName,
      type: mimeType || 'application/octet-stream',
      size: stats.size,
      shareId,
      userId: userId || null,
      status: 'IMPORT',
      embedUrl,
      isMediaEmbed: isMedia,
    },
  });

  // Statistik-Event loggen (fire-and-forget)
  logStatEvent("UPLOAD", { fileId: record.id, userId: userId || undefined, size: record.size });

  return record;
}

// ──────────────────────────────────────────────────────────
// CLAIM FLOW (Import → Uploads)
// ──────────────────────────────────────────────────────────
export async function claimFile(fileId: string, userId: string) {
  const file = await prisma.file.findUnique({ where: { id: fileId } }) as FileWithEmbed | null;

  if (!file) throw new Error('File not found');
  if (file.status !== 'IMPORT') throw new Error('File is not in import status');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { files: true },
  });
  if (!user) throw new Error('User not found');

  const totalUsed = user.files.reduce((sum, f) => sum + f.size, 0);
  if (totalUsed + file.size > (user.maxSize || 0)) {
    throw new Error('Storage limit exceeded');
  }

  await ensureDir(UPLOAD_DIR);

  const importPath = path.join(IMPORT_DIR, file.name);
  const uploadPath = path.join(UPLOAD_DIR, file.name);

  if (!existsSync(importPath)) {
    throw new Error('Import file not found on disk');
  }

  await rename(importPath, uploadPath);

  // Check if file is a media type and update embed URL
  const isMedia = isSupportedMediaType(file.type, file.originalName)
  const embedUrl = isMedia && !file.embedUrl ? generateEmbedUrl(file.shareId, file.originalName) : file.embedUrl || null

  return await prisma.file.update({
    where: { id: fileId },
    data: {
      userId,
      status: 'ACTIVE',
      embedUrl: embedUrl || undefined,
      isMediaEmbed: isMedia || !!file.isMediaEmbed,
    },
  });
}

// ──────────────────────────────────────────────────────────
// CLAIM ORPHANED: Assign orphaned disk file to user
// ──────────────────────────────────────────────────────────
export async function claimOrphanedFile(fileName: string, userId: string) {
  const safeName = path.basename(fileName);
  const importPath = path.join(IMPORT_DIR, safeName);

  if (!existsSync(importPath)) {
    throw new Error('File not found on disk');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { files: true },
  });
  if (!user) throw new Error('User not found');

  const stats = await stat(importPath);
  const totalUsed = user.files.reduce((sum, f) => sum + f.size, 0);
  if (totalUsed + stats.size > (user.maxSize || 0)) {
    throw new Error('Storage limit exceeded');
  }

  await ensureDir(UPLOAD_DIR);

  const ext = path.extname(safeName);
  const finalName = `${uuidv4()}${ext}`;
  const uploadPath = path.join(UPLOAD_DIR, finalName);

  await rename(importPath, uploadPath);

  const shareId = uuidv4();
  
  const mimeType = getMimeTypeFromExtension(ext)
  const isMedia = isSupportedMediaType(mimeType, safeName)
  const embedUrl = isMedia ? generateEmbedUrl(shareId, safeName) : null

  return await prisma.file.create({
    data: {
      name: finalName,
      originalName: safeName,
      type: mimeType,
      size: stats.size,
      shareId,
      userId,
      status: 'ACTIVE',
      embedUrl,
      isMediaEmbed: isMedia,
    },
  });
}

// ──────────────────────────────────────────────────────────
// DELETE
// ──────────────────────────────────────────────────────────
export async function deleteFile(fileId: string, userId?: string) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) throw new Error('File not found');

  if (userId && file.userId && file.userId !== userId) {
    throw new Error('Unauthorized');
  }

  const importPath = path.join(IMPORT_DIR, file.name);
  const uploadPath = path.join(UPLOAD_DIR, file.name);

  try {
    if (existsSync(importPath)) await unlink(importPath);
    else if (existsSync(uploadPath)) await unlink(uploadPath);
  } catch { /* ignore */ }

  await prisma.file.delete({ where: { id: fileId } });
}

// ──────────────────────────────────────────────────────────
// FILE LOOKUP
// ──────────────────────────────────────────────────────────
export async function getFileByShareId(shareId: string) {
  return await prisma.file.findUnique({
    where: { shareId },
    include: { user: { select: { name: true } } },
  });
}

// ──────────────────────────────────────────────────────────
// UNCLAIMED / ORPHANED FILES
// ──────────────────────────────────────────────────────────
export async function getUnclaimedFiles() {
  await ensureDir(IMPORT_DIR);
  await ensureDir(UPLOAD_DIR);

  const dbImportFiles = await prisma.file.findMany({
    where: { status: 'IMPORT' },
    orderBy: { createdAt: 'desc' },
  });

  const diskFiles = await readdir(IMPORT_DIR);
  const dbFileNames = new Set(dbImportFiles.map(f => f.name));

  const orphanedOnDisk = diskFiles
    .filter(fName => !dbFileNames.has(fName))
    .map(async (fName) => {
      const fullPath = path.join(IMPORT_DIR, fName);
      try {
        const s = await stat(fullPath);
        return {
          id: null,
          name: fName,
          originalName: fName,
          size: s.size,
          type: 'application/octet-stream',
          status: 'ORPHANED',
          createdAt: s.birthtime,
        };
      } catch { return null; }
    });

  const resolvedOrphans = (await Promise.all(orphanedOnDisk)).filter(Boolean);

  return {
    claimed: dbImportFiles.map(f => ({ ...f, password: f.plainPassword || undefined })),
    orphaned: resolvedOrphans,
  };
}

// ──────────────────────────────────────────────────────────
// DELETE ORPHANED FILE FROM DISK
// ──────────────────────────────────────────────────────────
export async function deleteOrphanedFile(fileName: string) {
  const safeName = path.basename(fileName);
  const filePath = path.join(IMPORT_DIR, safeName);
  if (!existsSync(filePath)) throw new Error('File not found on disk');
  await unlink(filePath);
}