import path from 'path';

/**
 * Resolve path correctly:
 * - If path is absolute (starts with /), use it directly.
 * - If path is relative, append it to the working directory.
 */
const resolvePath = (envPath: string | undefined, fallback: string) => {
  if (!envPath) return path.join(process.cwd(), fallback);
  return envPath.startsWith('/') ? envPath : path.join(process.cwd(), envPath);
};

export const UPLOAD_DIR = resolvePath(process.env.UPLOAD_DIR, 'data/uploads');
export const IMPORT_DIR = resolvePath(process.env.IMPORT_DIR, 'data/import');

export const CHUNK_SIZE = 512 * 1024; // 512KB – stays below nginx default (1m) so no proxy config is needed
export const DEFAULT_STORAGE_LIMIT = 524288000; // 500MB in bytes

// Video Extensions
export const VIDEO_EXTENSIONS = /\.(mp4|webm|avi|mov|mkv|wmv|flv|m4v|mpg|mpeg|3gp)$/i;

// Audio Extensions  
export const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|flac|aac|m4a|wma|opus)$/i;

// Image Extensions
export const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif|heic)$/i;

// Archive Extensions
export const ARCHIVE_EXTENSIONS = /\.(zip|rar|tar|gz|7z|bz2|xz)$/i;