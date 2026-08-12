import path from "path";
import { mkdir, rename, unlink } from "fs/promises";
import { existsSync } from "fs";
import { UPLOAD_DIR, IMPORT_DIR } from "./constants";

/**
 * Zentrale Pfad-Auflösung für Dateien.
 *
 * Layout:
 *   - User-Uploads:  /data/uploads/<userId>/<fileName>
 *   - Admin-Importe: /data/import/<fileName>
 *
 * Fallback: Bestehende Dateien, die noch flach in /data/uploads liegen
 * (vor dem Umbau), werden weiterhin gefunden.
 */

export interface StorageFileLike {
  name: string;
  userId?: string | null;
}

/**
 * Liefert den Ziel-Ordner für einen User (Uploads) und legt ihn an.
 * Ordner-Rechte: 0755 (kein Schreibzugriff für Andere, keine Execute-Bits für Dateien).
 */
export async function ensureUserUploadDir(userId: string): Promise<string> {
  const dir = path.join(UPLOAD_DIR, userId);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true, mode: 0o755 });
  }
  return dir;
}

/**
 * Vollständiger Pfad zu einer Datei im User-Uploads-Ordner.
 * Fallback auf flachen Pfad (Legacy), falls der User-Ordner nicht existiert.
 */
export function getUploadPath(file: StorageFileLike): string {
  if (file.userId) {
    const userDir = path.join(UPLOAD_DIR, file.userId, file.name);
    if (existsSync(userDir)) return userDir;
  }
  return path.join(UPLOAD_DIR, file.name);
}

/**
 * Vollständiger Pfad zu einer Datei im Import-Ordner.
 */
export function getImportPath(file: StorageFileLike): string {
  return path.join(IMPORT_DIR, file.name);
}

/**
 * Findet den tatsächlichen Pfad einer Datei (uploads ODER import).
 * Backward-kompatibel: existierende flache Dateien in /data/uploads werden gefunden.
 */
export function getFilePath(file: StorageFileLike): string {
  const uploadPath = getUploadPath(file);
  if (existsSync(uploadPath)) return uploadPath;

  const importPath = getImportPath(file);
  if (existsSync(importPath)) return importPath;

  // Letzter Fallback: Der Upload-Pfad, falls er noch nicht existiert (Fehlerfall)
  return uploadPath;
}

/**
 * Findet eine Datei zurück und liefert null, wenn sie nirgends existiert.
 */
export function findFileOnDisk(file: StorageFileLike): string | null {
  const uploadPath = getUploadPath(file);
  if (existsSync(uploadPath)) return uploadPath;

  const importPath = getImportPath(file);
  if (existsSync(importPath)) return importPath;

  return null;
}

/**
 * Verschiebt eine Datei aus dem Import-Ordner in den User-Uploads-Ordner.
 */
export async function moveImportToUploads(file: StorageFileLike, userId: string): Promise<string> {
  const importPath = getImportPath(file);
  if (!existsSync(importPath)) {
    throw new Error("Import file not found on disk");
  }

  const userDir = await ensureUserUploadDir(userId);
  const finalPath = path.join(userDir, file.name);

  await rename(importPath, finalPath);
  return finalPath;
}

/**
 * Löscht eine Datei vom Datenträger (egal ob Upload oder Import).
 * Ignoriert Fehler, wenn die Datei nicht existiert.
 */
export async function removeFileFromDisk(file: StorageFileLike): Promise<void> {
  const uploadPath = getFilePath(file);
  try {
    if (existsSync(uploadPath)) await unlink(uploadPath);
  } catch { /* ignore */ }
}

/**
 * Prüft ob eine Datei existiert (Uploads oder Import).
 */
export function fileExistsOnDisk(file: StorageFileLike): boolean {
  return existsSync(getUploadPath(file)) || existsSync(getImportPath(file));
}