import path from "path";
import { FileTypeCategory } from "./utils";

/**
 * Security helpers for file delivery.
 *
 * Core principles:
 *  - Only safe media types may be delivered inline (in the browser).
 *  - All risky types (SVG, HTML, JS, EXE, BAT, etc.) are always delivered as downloads (attachment).
 *  - MIME sniffing is suppressed with X-Content-Type-Options: nosniff.
 *  - SVG is detected by content and NEVER delivered inline.
 */

// ──────────────────────────────────────────────────────────
// INLINE WHITELIST
// ──────────────────────────────────────────────────────────
const SAFE_INLINE_VIDEO = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
const SAFE_INLINE_AUDIO = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/flac", "audio/aac", "audio/webm", "audio/x-wav", "audio/mp4"];
const SAFE_INLINE_IMAGE = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif", "image/bmp", "image/tiff", "image/apng", "image/jfif", "image/jpe", "image/vnd.microsoft.icon", "image/x-icon"];

const SAFE_INLINE_DOCUMENT = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "image/svg+xml", // checked in SAFE_INLINE_IMAGE - NOT here
];

// Extension-based whitelist (for files with a generic MIME type)
const SAFE_INLINE_EXTENSIONS = /\.(mp4|webm|m4v|ogv|mp3|wav|ogg|flac|aac|m4a|weba|opus|jpg|jpeg|png|gif|webp|avif|bmp|tif|tiff|apng|jfif|jpe|txt|md|markdown)$/i;

// Risky extensions that must NEVER be delivered inline
const UNSAFE_EXTENSIONS = /\.(svg|svgz|html|htm|js|mjs|cjs|jsx|ts|tsx|css|xml|xsl|xslt|json|pdf|exe|bat|cmd|com|msi|msix|appx|scr|jar|war|ear|apk|ipa|deb|rpm|dmg|pkg|run|sh|bash|zsh|ps1|psd1|psm1|py|pyw|ipynb|php|asp|aspx|jsp|do|action|bin|iso|img|vhd|vmdk|vhdx|qcow2|ova|ovf|dll|sys|drv|lib|so|unitypackage|cpl)$/i;

// ──────────────────────────────────────────────────────────
// FILE TYPE / EXECUTABLE DETECTION
// ──────────────────────────────────────────────────────────
const EXECUTABLE_EXTENSIONS = /\.(exe|bat|cmd|com|msi|msix|appx|scr|jar|war|ear|apk|ipa|deb|rpm|dmg|pkg|run|sh|bash|zsh|ps1|psd1|psm1|bin|iso|img|dll|sys|drv|lib|so|unitypackage|cpl|py|pyw|ipynb|php|asp|aspx|jsp)$/i;

const CODE_EXTENSIONS = /\.(html|htm|js|mjs|cjs|jsx|ts|tsx|css|xml|xsl|xslt|json|yaml|yml|svelte|vue|sql|r|lua|pl|pm|dart|scala|go|rs|rb|java|c|h|cpp|hpp|cxx|hpp|cc|cs|swift|sh|bash|zsh|bat|cmd|ps1|py|pyw|ipynb|php)$/i;

/**
 * Detects whether a file (based on MIME + extension) could contain
 * executable/dangerous code.
 */
export function isPotentiallyExecutable(mimeType: string, fileName: string): boolean {
  if (EXECUTABLE_EXTENSIONS.test(fileName)) return true;
  if (CODE_EXTENSIONS.test(fileName)) return true;

  // MIME check
  const mime = mimeType.toLowerCase();
  if (mime.includes("javascript") || mime.includes("ecmascript")) return true;
  if (mime.includes("html") || mime.includes("xml")) return true;
  if (mime.includes("x-msdownload") || mime.includes("x-bat") || mime.includes("x-msdos-program")) return true;
  if (mime.includes("java-archive") || mime.includes("x-java")) return true;
  if (mime.includes("x-sh") || mime.includes("x-shellscript")) return true;

  // SVG can contain JavaScript
  if (mime.includes("svg")) return true;

  return false;
}

/**
 * Detects the FileType category based on MIME + extension.
 * Reuses the utils.getFileTypeCategory() logic, but adapted
 * for DB storage. Executables/code are marked as such.
 */
export function getFileCategory(mimeType: string, fileName: string): FileTypeCategory {
  // Import the utils function dynamically to avoid circular imports
  // (utils.ts does not import file-security.ts, but better safe than sorry)
  // Simply duplicate the important logic here for the core categories:
  const mime = mimeType.toLowerCase();

  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("image/")) {
    // SVG is potentially dangerous → as "executable"? No, as "other" or "image"?
    // SVG stays "image", but is never delivered inline (isSafeInlineType)
    return "image";
  }

  // Check security-relevant categories first
  if (EXECUTABLE_EXTENSIONS.test(fileName)) return "executable";
  if (CODE_EXTENSIONS.test(fileName)) return "code";

  // PDFs can contain JavaScript
  if (/\.(pdf|xps|oxps)$/i.test(fileName)) return "pdf";
  if (mime.includes("pdf")) return "pdf";

  // Remaining logic based on utils (without import cycle)
  if (/\.(zip|rar|tar|gz|tgz|tbz|tbz2|txz|7z|bz2|xz|cab|arj|lha|lzh|zst|zstd|lz|lz4|br|sit|sitx|zipx|egg|z)$/i.test(fileName)) return "archive";
  if (/\.(stl|obj|fbx|step|stp|iges|igs|dwg|dxf|blend|glb|gltf|3ds|dae|ply|3mf|amf|c4d|max|ma|mb|skp|sldprt|sldasm|sat|x_t|x_b|ifc|ipt|iam|rvt|usdz)$/i.test(fileName)) return "model";
  if (/\.(json|jsonl|ndjson|xml|yaml|yml|toml|ini|cfg|conf|properties|opml|ics|ical|vcf|vcard|plist|reg|har|torrent|geojson|kml|gpx)$/i.test(fileName)) return "data";
  if (/\.(db|sqlite|sqlite3|db3|mdb|accdb|dbf|parquet|fmp12|fp7|kdb|kdbx)$/i.test(fileName)) return "database";
  if (/\.(ttf|otf|woff|woff2|eot|ttc|otc|fon|dfont)$/i.test(fileName)) return "font";
  if (/\.(psd|psb|psdt|ai|ps|eps|fig|sketch|xd|indd|cdr|xcf|afdesign|afphoto|pdn|kra|clip|sai)$/i.test(fileName)) return "design";
  if (/\.(pem|crt|key|pfx|p12|jks|cer|der|csr|p7b|p7c|spc|keystore|gpg)$/i.test(fileName)) return "key";
  if (/\.(xls|xlsx|xlsm|xlsb|xlt|xltx|xltm|ods|ots|csv|tsv|numbers|sxc|gnumeric|et)$/i.test(fileName)) return "spreadsheet";
  if (/\.(ppt|pptx|pptm|pps|ppsx|pot|potx|potm|odp|otp|keynote|sxi|fodp|dps)$/i.test(fileName)) return "presentation";
  if (/\.(epub|mobi|azw|azw1|azw3|azw4|kfx|kf8|djvu|fb2|lit|prc|ibooks|cbz|cbr|cb7|cba)$/i.test(fileName)) return "ebook";
  if (/\.(srt|vtt|ass|ssa|sub|sbv|ttml|dfxp|mpl2|idx)$/i.test(fileName)) return "subtitle";
  if (/\.(txt|text|md|markdown|mdown|rmd|rtf|rtfd|doc|docx|docm|dot|dotx|dotm|odt|pages|tex|log|nfo|wpd|wps|abw|rst|org|adoc|asciidoc|fountain|pub|eml|msg|mht|mhtml)$/i.test(fileName)) return "document";
  if (/\.(mp4|webm|avi|mov|mkv|wmv|flv|m4v|mpg|mpeg|3gp|3g2|m2ts|mts|vob|divx|rm|rmvb|ogv|ogm|f4v|f4p)$/i.test(fileName)) return "video";
  if (/\.(mp3|wav|ogg|flac|aac|m4a|m4b|m4p|wma|opus|aif|aiff|au|mid|midi|amr|ra|weba|ape|wv|mp2|mod|s3m|it|xm)$/i.test(fileName)) return "audio";
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif|heic|heif|tif|tiff|tga|targa|exr|hdr|dds|jfif|jpe|pnm|pbm|pgm|ppm|wbmp|pict|apng)$/i.test(fileName)) return "image";

  return "other";
}

/**
 * Determines whether a file is safe to deliver inline.
 * SVG and all risky types → false.
 */
export function isSafeInlineType(mimeType: string, fileName: string): boolean {
  const mime = (mimeType || "").toLowerCase();

  // SVG never inline (script injection)
  if (mime.includes("svg") || /\.svgz?$/i.test(fileName)) return false;

  // Extension-based blacklist
  if (UNSAFE_EXTENSIONS.test(fileName)) return false;

  // MIME whitelist
  if (SAFE_INLINE_VIDEO.includes(mime)) return true;
  if (SAFE_INLINE_AUDIO.includes(mime)) return true;
  if (SAFE_INLINE_IMAGE.includes(mime)) return true;

  // Otherwise: only if the extension is safe
  return SAFE_INLINE_EXTENSIONS.test(fileName);
}

/**
 * Magic-bytes detection - checks the real file type based on the first bytes.
 * Prevents malicious files from being disguised as harmless types.
 */
export function detectFileType(buffer: Buffer): { mimeType: string; category: string } {
  if (!buffer || buffer.length < 12) {
    return { mimeType: "application/octet-stream", category: "other" };
  }

  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { mimeType: "image/png", category: "image" };
  }

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", category: "image" };
  }

  // GIF
  if (buffer.toString("ascii", 0, 3) === "GIF") {
    return { mimeType: "image/gif", category: "image" };
  }

  // WebP
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return { mimeType: "image/webp", category: "image" };
  }

  // AVIF (ISO BMFF)
  if (buffer.toString("ascii", 4, 8) === "ftyp" && buffer.toString("ascii", 8, 12) === "avif") {
    return { mimeType: "image/avif", category: "image" };
  }

  // BMP
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return { mimeType: "image/bmp", category: "image" };
  }

  // TIFF
  if ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
      (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a)) {
    return { mimeType: "image/tiff", category: "image" };
  }

  // SVG (XML-based, search for `<svg` or `<?xml`+`<svg`)
  if (buffer.toString("utf8", 0, 512).includes("<svg")) {
    return { mimeType: "image/svg+xml", category: "image" };
  }

  // PDF
  if (buffer.toString("ascii", 0, 5) === "%PDF-") {
    return { mimeType: "application/pdf", category: "pdf" };
  }

  // ZIP (also DOCX/XLSX/PPTX, JAR, etc.)
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)) {
    return { mimeType: "application/zip", category: "archive" };
  }

  // RAR
  if (buffer.toString("ascii", 0, 6) === "Rar!\x1a\x07") {
    return { mimeType: "application/x-rar-compressed", category: "archive" };
  }

  // 7Z
  if (buffer.toString("ascii", 0, 6) === "7z\xbc\xaf\x27\x1c") {
    return { mimeType: "application/x-7z-compressed", category: "archive" };
  }

  // GZIP
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
    return { mimeType: "application/gzip", category: "archive" };
  }

  // MP4 / M4A / MOV (ISO BMFF)
  if (buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12);
    if (["avc1", "isom", "mp41", "mp42", "dash"].includes(brand)) {
      return { mimeType: "video/mp4", category: "video" };
    }
    if (["M4A ", "M4B ", "M4P "].includes(brand) || buffer.toString("ascii", 0, 4) === "ftyp") {
      return { mimeType: "audio/mp4", category: "audio" };
    }
    if (["qt  "].includes(brand)) {
      return { mimeType: "video/quicktime", category: "video" };
    }
  }

  // WEBM / MKV (EBML)
  if (buffer.toString("ascii", 0, 4) === "\x1a\x45\xdf\xa3") {
    // Distinguish WebM from MKV based on the DocType
    const docType = buffer.toString("utf8", 4, 64).includes("webm") ? "webm" : "matroska";
    if (docType === "webm") {
      return { mimeType: "video/webm", category: "video" };
    }
    return { mimeType: "video/x-matroska", category: "video" };
  }

  // MP3 (ID3)
  if (buffer.toString("ascii", 0, 3) === "ID3") {
    return { mimeType: "audio/mpeg", category: "audio" };
  }

  // WAV / RIFF
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WAVE") {
    return { mimeType: "audio/wav", category: "audio" };
  }

  // OGG
  if (buffer.toString("ascii", 0, 4) === "OggS") {
    return { mimeType: "audio/ogg", category: "audio" };
  }

  // FLAC
  if (buffer.toString("ascii", 0, 4) === "fLaC") {
    return { mimeType: "audio/flac", category: "audio" };
  }

  // ELF (Linux executable)
  if (buffer[0] === 0x7f && buffer.toString("ascii", 1, 4) === "ELF") {
    return { mimeType: "application/x-executable", category: "executable" };
  }

  // PE (Windows executable)
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) { // "MZ"
    return { mimeType: "application/x-msdownload", category: "executable" };
  }

  // Mach-O (macOS executable)
  if (buffer.toString("ascii", 0, 4) === "\xfe\xed\xfa\xce" || buffer.toString("ascii", 0, 4) === "\xfe\xed\xfa\xcf" ||
      buffer.toString("ascii", 0, 4) === "\xca\xfe\xba\xbe" || buffer.toString("ascii", 0, 4) === "\xcf\xfa\xed\xfe") {
    return { mimeType: "application/x-mach-binary", category: "executable" };
  }

  // TAR
  if (buffer.toString("ascii", 257, 262) === "ustar") {
    return { mimeType: "application/x-tar", category: "archive" };
  }

  // JAVA Class
  if (buffer[0] === 0xca && buffer[1] === 0xfe && buffer[2] === 0xba && buffer[3] === 0xbe) {
    return { mimeType: "application/java-vm", category: "executable" };
  }

  // Unicode/UTF-8 Text
  const sample = buffer.toString("utf8", 0, 512);
  if (sample && /^[\x09\x0a\x0d\x20-\x7e\xc2-\xf4][\x09\x0a\x0d\x20-\x7e]*$/.test(sample)) {
    return { mimeType: "text/plain", category: "document" };
  }

  return { mimeType: "application/octet-stream", category: "other" };
}

/**
 * Magic-bytes detection for font files (TTF/OTF/WOFF/WOFF2/TTC).
 * Checks whether the file really is a font before it is stored
 * as a custom font.
 */
export function detectFontType(buffer: Buffer): { mimeType: string; ext: string; format: string } | null {
  if (!buffer || buffer.length < 4) return null;

  // WOFF2
  if (buffer[0] === 0x77 && buffer[1] === 0x4f && buffer[2] === 0x46 && buffer[3] === 0x32) {
    return { mimeType: "font/woff2", ext: ".woff2", format: "woff2" };
  }
  // WOFF
  if (buffer[0] === 0x77 && buffer[1] === 0x4f && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return { mimeType: "font/woff", ext: ".woff", format: "woff" };
  }

  const tag = buffer.toString("ascii", 0, 4);
  // TrueType collection
  if (tag === "ttcf") {
    return { mimeType: "font/collection", ext: ".ttc", format: "truetype" };
  }
  // OpenType (CFF)
  if (tag === "OTTO") {
    return { mimeType: "font/otf", ext: ".otf", format: "opentype" };
  }
  // TrueType (glyf)
  if (buffer[0] === 0x00 && buffer[1] === 0x01 && buffer[2] === 0x00 && buffer[3] === 0x00) {
    return { mimeType: "font/ttf", ext: ".ttf", format: "truetype" };
  }

  return null;
}

/**
 * Builds consistent response headers for file delivery.
 * Always sets X-Content-Type-Options: nosniff.
 */
export function buildFileHeaders(
  mimeType: string,
  contentLength: number | string,
  contentDisposition: string,
  extra?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": mimeType || "application/octet-stream",
    "Content-Length": contentLength.toString(),
    "Content-Disposition": contentDisposition,
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  };

  if (extra) {
    Object.assign(headers, extra);
  }

  return headers;
}

/**
 * Creates the Content-Disposition header for download or inline display.
 * Ensures correct encoding of the file name.
 */
export function buildContentDisposition(
  fileName: string,
  disposition: "attachment" | "inline"
): string {
  const encodedFilename = encodeURIComponent(fileName);
  return `${disposition}; filename="${fileName}"; filename*=UTF-8''${encodedFilename}`;
}

/**
 * Determines whether a file should be delivered as a download (attachment) or inline.
 * Non-safe types → always attachment.
 */
export function getDeliveryDisposition(
  mimeType: string,
  fileName: string,
  forceDownload = false
): "attachment" | "inline" {
  if (forceDownload) return "attachment";
  return isSafeInlineType(mimeType, fileName) ? "inline" : "attachment";
}