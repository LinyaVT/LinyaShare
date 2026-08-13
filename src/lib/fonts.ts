import { readFile, writeFile, mkdir, chmod } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { FONTS_DIR, CUSTOM_FONTS_DIR } from "./constants";
import { FONT_MAP } from "./theme";

// ──────────────────────────────────────────────────────────
// SELF-HOSTED FONTS
// ──────────────────────────────────────────────────────────
// Builtin-Fonts (FONT_MAP) werden beim ersten Aufruf einmalig von
// Google Fonts geladen und unter FONTS_DIR/<key>/ als woff2 + style.css
// gecacht. Danach liefert der Server alles lokal aus.
// Custom-Fonts (Admin-Upload) liegen unter CUSTOM_FONTS_DIR/<key>/ mit
// bereits generiertem style.css.
//
// Wichtig: Nur der latin-Subset wird geladen (reicht für Deutsch inkl.
// ä/ö/ü/ß) – spart ~80% Download-Volumen gegenüber allen Subsets.

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const SAFE_KEY_RE = /^[a-zA-Z0-9][a-zA-Z0-9 _-]*$/
const SAFE_FILE_RE = /^[a-zA-Z0-9._-]+$/

// Dedupe gleichzeitiger Downloads pro Font (sonst könnten parallele
// Erstaufrufe denselben Font mehrfach herunterladen).
const inFlight = new Map<string, Promise<string>>()

function isSafeKey(key: string): boolean {
  return SAFE_KEY_RE.test(key) && !key.includes("..") && !key.includes("/") && !key.includes("\\")
}

function isSafeFile(name: string): boolean {
  return SAFE_FILE_RE.test(name) && !name.includes("..")
}

const builtinDir = (key: string) => path.join(FONTS_DIR, key)
const customDir = (key: string) => path.join(CUSTOM_FONTS_DIR, key)

async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true, mode: 0o755 })
  }
}

// ──────────────────────────────────────────────────────────
// GOOGLE-CSS → @font-face (latin gefiltert)
// ──────────────────────────────────────────────────────────

interface FontFace {
  family: string
  style: string
  weight: string
  display: string
  stretch: string
  unicodeRange: string
  url: string
  format: string
}

function parseFontFaces(css: string): FontFace[] {
  const faces: FontFace[] = []
  const blockRe = /@font-face\s*\{([^}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = blockRe.exec(css))) {
    const body = m[1]
    const get = (prop: string): string => {
      const re = new RegExp(`${prop}\\s*:\\s*([^;]+);`, "i")
      const mm = re.exec(body)
      return mm ? mm[1].trim().replace(/^["']|["']$/g, "") : ""
    }
    const srcRe = /url\(([^)]+)\)\s*format\(["']([^"']+)["']\)/
    const sm = srcRe.exec(body)
    if (!sm) continue
    const family = get("font-family")
    if (!family) continue
    faces.push({
      family,
      style: get("font-style") || "normal",
      weight: get("font-weight") || "400",
      display: get("font-display") || "swap",
      stretch: get("font-stretch") || "",
      unicodeRange: get("unicode-range") || "",
      url: sm[1].trim(),
      format: sm[2].toLowerCase(),
    })
  }
  return faces
}

// Nur latin behalten: Google's latin-Subset startet mit U+0000-00FF
// (deckt lateinische + Basiszeichen, auch ä/ö/ü/ß ab). Fallback: URL
// enthält "-latin.".
function isLatin(face: FontFace): boolean {
  if (face.unicodeRange.includes("U+0000-00FF")) return true
  return /-latin[\-.]/.test(face.url)
}

function renderFontFace(face: FontFace): string {
  const lines = [
    "@font-face {",
    `  font-family: '${face.family}';`,
    `  font-style: ${face.style};`,
    `  font-weight: ${face.weight};`,
    face.stretch ? `  font-stretch: ${face.stretch};` : "",
    `  font-display: ${face.display};`,
    `  src: url(${face.url}) format('${face.format}');`,
    face.unicodeRange ? `  unicode-range: ${face.unicodeRange};` : "",
    "}",
  ].filter(Boolean)
  return lines.join("\n")
}

// ──────────────────────────────────────────────────────────
// BUILTIN FONTS (Lazy-Download)
// ──────────────────────────────────────────────────────────

async function downloadWoff2(url: string, dir: string): Promise<string> {
  const raw = url.split("/").pop() || "font.woff2"
  const fileName = raw.replace(/[^a-zA-Z0-9._-]/g, "_")
  const dest = path.join(dir, fileName)
  if (!existsSync(dest)) {
    const res = await fetch(url, { headers: { "User-Agent": CHROME_UA } })
    if (!res.ok) throw new Error(`Font-Download fehlgeschlagen: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await writeFile(dest, buf)
    await chmod(dest, 0o644).catch(() => {})
  }
  return fileName
}

async function downloadBuiltinFont(key: string): Promise<string> {
  const entry = FONT_MAP[key]
  if (!entry) throw new Error("Unknown font")
  if (!entry.googleUrl) throw new Error(`Kein Google-Quell-URL für "${key}"`)
  const res = await fetch(entry.googleUrl, { headers: { "User-Agent": CHROME_UA } })
  if (!res.ok) throw new Error(`Google-Fonts-Request fehlgeschlagen: ${res.status}`)
  const css = await res.text()

  const faces = parseFontFaces(css).filter(isLatin)
  if (faces.length === 0) throw new Error("Keine latin-Font-Faces gefunden")

  const dir = builtinDir(key)
  await ensureDir(dir)

  for (const face of faces) {
    face.url = `./${await downloadWoff2(face.url, dir)}`
  }

  const out = faces.map(renderFontFace).join("\n\n")
  const cssPath = path.join(dir, "style.css")
  await writeFile(cssPath, out, "utf8")
  await chmod(cssPath, 0o644).catch(() => {})
  return out
}

/** Liefert das CSS für einen Builtin-Font (downloadt ihn beim ersten Aufruf). */
export async function getBuiltinFontCss(key: string): Promise<string> {
  const dir = builtinDir(key)
  const cssPath = path.join(dir, "style.css")
  if (existsSync(cssPath)) {
    return readFile(cssPath, "utf8")
  }
  const pending = inFlight.get(key)
  if (pending) return pending
  const p = downloadBuiltinFont(key)
  inFlight.set(key, p)
  try {
    return await p
  } finally {
    inFlight.delete(key)
  }
}

// ──────────────────────────────────────────────────────────
// CUSTOM FONTS (Admin-Upload)
// ──────────────────────────────────────────────────────────

/** Liefert das beim Upload generierte @font-face-CSS eines Custom-Fonts. */
export async function getCustomFontCss(key: string): Promise<string> {
  const cssPath = path.join(customDir(key), "style.css")
  if (!existsSync(cssPath)) throw new Error("Not found")
  return readFile(cssPath, "utf8")
}

/**
 * Prüft key/file auf Sicherheit und liefert den absoluten Pfad,
 * garantiert innerhalb des Font-Verzeichnisses (kein Path-Traversal).
 */
export function resolveFontFile(key: string, file: string): { absPath: string; isCustom: boolean } | null {
  if (!isSafeKey(key) || !isSafeFile(file)) return null
  if (FONT_MAP[key]) {
    const dir = path.resolve(builtinDir(key))
    const absPath = path.resolve(dir, file)
    if (!absPath.startsWith(dir + path.sep)) return null
    return { absPath, isCustom: false }
  }
  if (key.startsWith("custom-")) {
    const dir = path.resolve(customDir(key))
    const absPath = path.resolve(dir, file)
    if (!absPath.startsWith(dir + path.sep)) return null
    return { absPath, isCustom: true }
  }
  return null
}

export const FONT_MIME: Record<string, string> = {
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".ttc": "font/collection",
  ".otc": "font/collection",
  ".eot": "application/vnd.ms-fontobject",
}
