// ──────────────────────────────────────────────────────────
// THEME ENGINE
// ──────────────────────────────────────────────────────────
// Das Theme wird als `theme.*` Settings in der Datenbank gespeichert,
// von `resolveTheme()` zu einer valide Struktur aufgelöst und von
// `computeCssVars()` in CSS-Variablen übersetzt.
// Die Datei ist rein (keine Node/Next-Imports) → Server & Client nutzbar.

// ──────────────────────────────────────────────────────────
// DEFAULT THEME
// ──────────────────────────────────────────────────────────

export interface ThemeConfig {
  accentMode: "single" | "gradient"
  accentColor: string
  accentFrom: string
  accentTo: string
  gradientDirection: string
  backgroundType: "particles" | "solid" | "gradient" | "image" | "none"
  backgroundColor: string
  backgroundFrom: string
  backgroundTo: string
  backgroundDirection: string
  backgroundImageDim: number
  backgroundImageBlur: number
  headerSticky: boolean
  headerStyle: "blur" | "solid" | "transparent"
  fontBody: string
  fontHeading: string
}

export const DEFAULT_THEME: ThemeConfig = {
  accentMode: "single",
  accentColor: "#db2777",
  accentFrom: "#ec4899",
  accentTo: "#db2777",
  gradientDirection: "135deg",
  backgroundType: "particles",
  backgroundColor: "#0a0a0f",
  backgroundFrom: "#0a0a0f",
  backgroundTo: "#11111a",
  backgroundDirection: "135deg",
  backgroundImageDim: 65,
  backgroundImageBlur: 16,
  headerSticky: true,
  headerStyle: "blur",
  fontBody: "Inter",
  fontHeading: "Orbitron",
}

// ──────────────────────────────────────────────────────────
// WHITELISTS (Sanitization)
// ──────────────────────────────────────────────────────────

const ACCENT_MODES = new Set(["single", "gradient"])
const BACKGROUND_TYPES = new Set(["particles", "solid", "gradient", "image", "none"])
const HEADER_STYLES = new Set(["blur", "solid", "transparent"])

export const GRADIENT_DIRECTIONS = [
  "135deg",
  "45deg",
  "90deg",
  "180deg",
  "to right",
  "to left",
  "to top",
  "to bottom",
  "to top right",
  "to top left",
  "to bottom right",
  "to bottom left",
  "radial",
]

export function isGradientDirection(v: string): boolean {
  if (v === "radial") return true
  if (GRADIENT_DIRECTIONS.includes(v)) return true
  const m = /^(\d{1,3})deg$/.exec(v)
  if (!m) return false
  const deg = parseInt(m[1], 10)
  return deg >= 0 && deg <= 360
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/
const isHex = (v?: string): v is string => !!v && HEX_RE.test(v)

function clampNumber(v: string | undefined, min: number, max: number, fallback: number): number {
  if (v === undefined || v === null || v === "") return fallback
  const n = parseFloat(v)
  if (isNaN(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

// ──────────────────────────────────────────────────────────
// FONT MAP (Self-Hosted, via /api/fonts/<key>/style.css)
// ──────────────────────────────────────────────────────────
// Die Schriftdateien werden lokal unter data/uploads/global/fonts
// abgelegt und vom Server ausgeliefert. Beim ersten Aufruf lädt der
// Server die woff2-Dateien einmalig von Google Fonts herunter und
// cached sie dort – Besucher greifen danach nie auf Google zu.
// Custom-Fonts (Admin-Upload) werden über `theme.customFonts` ergänzt.

export interface FontEntry {
  label: string
  family: string
  url: string
  /** Google-Fonts-CSS-URL – wird nur beim einmaligen Erst-Download genutzt. */
  googleUrl?: string
}

export type FontMap = Record<string, FontEntry>

export const FONT_MAP: FontMap = {
  Inter: {
    label: "Inter",
    family: "'Inter', sans-serif",
    url: "/api/fonts/Inter/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
  },
  Orbitron: {
    label: "Orbitron",
    family: "'Orbitron', sans-serif",
    url: "/api/fonts/Orbitron/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800&display=swap",
  },
  Poppins: {
    label: "Poppins",
    family: "'Poppins', sans-serif",
    url: "/api/fonts/Poppins/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap",
  },
  Roboto: {
    label: "Roboto",
    family: "'Roboto', sans-serif",
    url: "/api/fonts/Roboto/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap",
  },
  "Open Sans": {
    label: "Open Sans",
    family: "'Open Sans', sans-serif",
    url: "/api/fonts/Open Sans/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700;800&display=swap",
  },
  Montserrat: {
    label: "Montserrat",
    family: "'Montserrat', sans-serif",
    url: "/api/fonts/Montserrat/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap",
  },
  "Space Grotesk": {
    label: "Space Grotesk",
    family: "'Space Grotesk', sans-serif",
    url: "/api/fonts/Space Grotesk/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap",
  },
  Raleway: {
    label: "Raleway",
    family: "'Raleway', sans-serif",
    url: "/api/fonts/Raleway/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700;800&display=swap",
  },
  Ubuntu: {
    label: "Ubuntu",
    family: "'Ubuntu', sans-serif",
    url: "/api/fonts/Ubuntu/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap",
  },
  "DM Sans": {
    label: "DM Sans",
    family: "'DM Sans', sans-serif",
    url: "/api/fonts/DM Sans/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap",
  },
  "Bebas Neue": {
    label: "Bebas Neue",
    family: "'Bebas Neue', sans-serif",
    url: "/api/fonts/Bebas Neue/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap",
  },
  "IBM Plex Sans": {
    label: "IBM Plex Sans",
    family: "'IBM Plex Sans', sans-serif",
    url: "/api/fonts/IBM Plex Sans/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap",
  },
  "JetBrains Mono": {
    label: "JetBrains Mono",
    family: "'JetBrains Mono', monospace",
    url: "/api/fonts/JetBrains Mono/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap",
  },
  Lora: {
    label: "Lora",
    family: "'Lora', serif",
    url: "/api/fonts/Lora/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap",
  },
  Merriweather: {
    label: "Merriweather",
    family: "'Merriweather', serif",
    url: "/api/fonts/Merriweather/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&display=swap",
  },
  "Playfair Display": {
    label: "Playfair Display",
    family: "'Playfair Display', serif",
    url: "/api/fonts/Playfair Display/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&display=swap",
  },
  "Nunito Sans": {
    label: "Nunito Sans",
    family: "'Nunito Sans', sans-serif",
    url: "/api/fonts/Nunito Sans/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700;800&display=swap",
  },
  "Source Sans 3": {
    label: "Source Sans 3",
    family: "'Source Sans 3', sans-serif",
    url: "/api/fonts/Source Sans 3/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600;700&display=swap",
  },
  Manrope: {
    label: "Manrope",
    family: "'Manrope', sans-serif",
    url: "/api/fonts/Manrope/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap",
  },
  Outfit: {
    label: "Outfit",
    family: "'Outfit', sans-serif",
    url: "/api/fonts/Outfit/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap",
  },
  Sora: {
    label: "Sora",
    family: "'Sora', sans-serif",
    url: "/api/fonts/Sora/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap",
  },
  Archivo: {
    label: "Archivo",
    family: "'Archivo', sans-serif",
    url: "/api/fonts/Archivo/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600;700;800&display=swap",
  },
  "Exo 2": {
    label: "Exo 2",
    family: "'Exo 2', sans-serif",
    url: "/api/fonts/Exo 2/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700;800&display=swap",
  },
  Rajdhani: {
    label: "Rajdhani",
    family: "'Rajdhani', sans-serif",
    url: "/api/fonts/Rajdhani/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap",
  },
  Audiowide: {
    label: "Audiowide",
    family: "'Audiowide', sans-serif",
    url: "/api/fonts/Audiowide/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Audiowide&display=swap",
  },
  Righteous: {
    label: "Righteous",
    family: "'Righteous', sans-serif",
    url: "/api/fonts/Righteous/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Righteous&display=swap",
  },
  Bungee: {
    label: "Bungee",
    family: "'Bungee', sans-serif",
    url: "/api/fonts/Bungee/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Bungee&display=swap",
  },
  "Press Start 2P": {
    label: "Press Start 2P",
    family: "'Press Start 2P', cursive",
    url: "/api/fonts/Press Start 2P/style.css",
    googleUrl: "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap",
  },
}

// ──────────────────────────────────────────────────────────
// CUSTOM FONTS (Admin-Uploads)
// ──────────────────────────────────────────────────────────

export interface CustomFontEntry {
  key: string
  label: string
  family: string
  ext: string
  mime: string
  size?: number
}

const CUSTOM_KEY_RE = /^custom-[a-z0-9-]+$/
const isSafeCustomFont = (e: unknown): e is CustomFontEntry => {
  if (!e || typeof e !== "object") return false
  const f = e as CustomFontEntry
  return (
    typeof f.key === "string" && CUSTOM_KEY_RE.test(f.key) &&
    typeof f.label === "string" && typeof f.family === "string" &&
    typeof f.ext === "string" && typeof f.mime === "string"
  )
}

/** Parsiert das `theme.customFonts`-Setting (JSON-Array) → list of entries. */
export function parseCustomFonts(json: string | undefined | null): CustomFontEntry[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed.filter(isSafeCustomFont) : []
  } catch {
    return []
  }
}

/** Wandelt Custom-Font-Entries in eine FontMap (Body/Heading-Auswahl). */
export function customFontsToMap(entries: CustomFontEntry[]): FontMap {
  const map: FontMap = {}
  for (const e of entries) {
    map[e.key] = { label: e.label, family: e.family, url: `/api/fonts/${e.key}/style.css` }
  }
  return map
}

/** Merged zwei FontMaps (base wird von extra überlagert). */
export function mergeFontMaps(base: FontMap, extra: FontMap): FontMap {
  return { ...base, ...extra }
}

// ──────────────────────────────────────────────────────────
// COLOR MATH
// ──────────────────────────────────────────────────────────

export interface RGB {
  r: number
  g: number
  b: number
}

export const DEFAULT_RGB: RGB = { r: 236, g: 72, b: 153 }

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "").trim()
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return DEFAULT_RGB
  const n = parseInt(clean, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function toTriplet(c: RGB): string {
  return `${c.r} ${c.g} ${c.b}`
}

export function hexTriplet(hex: string): string {
  return toTriplet(hexToRgb(hex))
}

export function rgbaFromHex(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function mix(c: RGB, target: RGB, ratio: number): RGB {
  return {
    r: Math.round(c.r + (target.r - c.r) * ratio),
    g: Math.round(c.g + (target.g - c.g) * ratio),
    b: Math.round(c.b + (target.b - c.b) * ratio),
  }
}

const WHITE: RGB = { r: 255, g: 255, b: 255 }
const BLACK: RGB = { r: 0, g: 0, b: 0 }

// Light shades (50-400): mix toward white
const RAMP_WHITE: Record<number, number> = { 50: 0.88, 100: 0.76, 200: 0.62, 300: 0.45, 400: 0.22 }
// Dark shades (600-900): mix toward black
const RAMP_BLACK: Record<number, number> = { 600: 0.12, 700: 0.25, 800: 0.38, 900: 0.5 }

// ──────────────────────────────────────────────────────────
// RESOLVE THEME (settings map -> ThemeConfig)
// ──────────────────────────────────────────────────────────

export function resolveTheme(settings: Record<string, string> | undefined, fontMap: FontMap = FONT_MAP): ThemeConfig {
  const s = settings || {}
  const get = (key: string, fallback: string) => {
    const v = s[`theme.${key}`]
    return v === undefined || v === null || v === "" ? fallback : v
  }

  const accentMode = ACCENT_MODES.has(get("accentMode", DEFAULT_THEME.accentMode)) ? get("accentMode", DEFAULT_THEME.accentMode) as ThemeConfig["accentMode"] : "single"
  const backgroundType = BACKGROUND_TYPES.has(get("backgroundType", "particles")) ? get("backgroundType", "particles") as ThemeConfig["backgroundType"] : "particles"
  const headerStyle = HEADER_STYLES.has(get("headerStyle", "blur")) ? get("headerStyle", "blur") as ThemeConfig["headerStyle"] : "blur"

  const gradientDirection = isGradientDirection(get("gradientDirection", DEFAULT_THEME.gradientDirection)) ? get("gradientDirection", DEFAULT_THEME.gradientDirection) : DEFAULT_THEME.gradientDirection
  const backgroundDirection = isGradientDirection(get("backgroundDirection", DEFAULT_THEME.backgroundDirection)) ? get("backgroundDirection", DEFAULT_THEME.backgroundDirection) : DEFAULT_THEME.backgroundDirection

  const fontBody = fontMap[get("fontBody", "Inter")] ? get("fontBody", "Inter") : "Inter"
  const fontHeading = fontMap[get("fontHeading", "Orbitron")] ? get("fontHeading", "Orbitron") : "Orbitron"

  return {
    accentMode,
    accentColor: isHex(get("accentColor", DEFAULT_THEME.accentColor)) ? get("accentColor", DEFAULT_THEME.accentColor) : DEFAULT_THEME.accentColor,
    accentFrom: isHex(get("accentFrom", DEFAULT_THEME.accentFrom)) ? get("accentFrom", DEFAULT_THEME.accentFrom) : DEFAULT_THEME.accentFrom,
    accentTo: isHex(get("accentTo", DEFAULT_THEME.accentTo)) ? get("accentTo", DEFAULT_THEME.accentTo) : DEFAULT_THEME.accentTo,
    gradientDirection,
    backgroundType,
    backgroundColor: isHex(get("backgroundColor", DEFAULT_THEME.backgroundColor)) ? get("backgroundColor", DEFAULT_THEME.backgroundColor) : DEFAULT_THEME.backgroundColor,
    backgroundFrom: isHex(get("backgroundFrom", DEFAULT_THEME.backgroundFrom)) ? get("backgroundFrom", DEFAULT_THEME.backgroundFrom) : DEFAULT_THEME.backgroundFrom,
    backgroundTo: isHex(get("backgroundTo", DEFAULT_THEME.backgroundTo)) ? get("backgroundTo", DEFAULT_THEME.backgroundTo) : DEFAULT_THEME.backgroundTo,
    backgroundDirection,
    backgroundImageDim: clampNumber(get("backgroundImageDim", "0"), 0, 100, 0),
    backgroundImageBlur: clampNumber(get("backgroundImageBlur", "0"), 0, 50, 0),
    headerSticky: get("headerSticky", "true") !== "false",
    headerStyle,
    fontBody,
    fontHeading,
  }
}

// ──────────────────────────────────────────────────────────
// GRADIENT BUILDER
// ──────────────────────────────────────────────────────────

function buildGradient(kind: "linear" | "radial", direction: string, from: string, to: string): string {
  if (kind === "radial" || direction === "radial") {
    return `radial-gradient(circle at center, ${from}, ${to})`
  }
  return `linear-gradient(${direction}, ${from}, ${to})`
}

// ──────────────────────────────────────────────────────────
// COMPUTE CSS VARS
// ──────────────────────────────────────────────────────────

export function computeCssVars(theme: ThemeConfig, fontMap: FontMap = FONT_MAP): Record<string, string> {
  const baseHex = theme.accentMode === "single" ? theme.accentColor : theme.accentFrom
  const base = hexToRgb(baseHex)
  const vars: Record<string, string> = {}

  // Primary ramp from base accent color
  for (const [shade, ratio] of Object.entries(RAMP_WHITE)) {
    vars[`--primary-${shade}`] = toTriplet(mix(base, WHITE, ratio))
  }
  vars["--primary-500"] = toTriplet(base)
  for (const [shade, ratio] of Object.entries(RAMP_BLACK)) {
    vars[`--primary-${shade}`] = toTriplet(mix(base, BLACK, ratio))
  }

  // Accent gradient (used by gradient-text, buttons, progress bars, …)
  const accentGradient =
    theme.accentMode === "gradient"
      ? buildGradient(theme.gradientDirection === "radial" ? "radial" : "linear", theme.gradientDirection, theme.accentFrom, theme.accentTo)
      : buildGradient(theme.gradientDirection === "radial" ? "radial" : "linear", theme.gradientDirection === "radial" ? "radial" : "135deg", `rgb(var(--primary-400))`, `rgb(var(--primary-600))`)

  vars["--accent-direction"] = theme.gradientDirection
  vars["--accent-gradient"] = accentGradient

  // Background
  let bgImage = "none"
  let bgColor = theme.backgroundColor
  let bgAttachment = "scroll"

  if (theme.backgroundType === "particles") {
    bgImage =
      `radial-gradient(ellipse at 15% 80%, ${rgbaFromHex(baseHex, 0.08)} 0%, transparent 50%), ` +
      `radial-gradient(ellipse at 85% 20%, ${rgbaFromHex(baseHex, 0.06)} 0%, transparent 50%)`
    bgColor = DEFAULT_THEME.backgroundColor
  } else if (theme.backgroundType === "gradient") {
    bgImage = buildGradient(theme.backgroundDirection === "radial" ? "radial" : "linear", theme.backgroundDirection, theme.backgroundFrom, theme.backgroundTo)
    bgAttachment = "fixed"
    bgColor = theme.backgroundFrom
  } else if (theme.backgroundType === "image") {
    // Das Bild wird auf einem eigenen Layer (`body::before`) gerendert, damit
    // Dim (dunkler Overlay) und Blur (`filter`) das Bild abdunkeln/weichzeichnen,
    // ohne den Seiteninhalt mit zu beeinflussen. `body` selbst bleibt dabei
    // transparent, sonst würde die undurchsichtige Body-Farbe den Layer abdecken.
    const dim = Math.min(100, Math.max(0, theme.backgroundImageDim)) / 100
    const blur = Math.min(50, Math.max(0, theme.backgroundImageBlur))
    const dimLayer = dim > 0 ? `linear-gradient(rgba(0,0,0,${dim.toFixed(3)}), rgba(0,0,0,${dim.toFixed(3)})), ` : ""
    bgImage = "none"
    bgColor = "transparent"
    vars["--background-image-layer"] = `${dimLayer}url('/api/admin/background')`
    vars["--background-blur"] = `${blur}px`
    vars["--background-color-layer"] = theme.backgroundColor
  }

  vars["--background-image"] = bgImage
  vars["--background-color"] = bgColor
  vars["--background-attachment"] = bgAttachment

  // Particle color (RGB triplet, read by AnimatedBackground)
  vars["--particle-color"] = toTriplet(base)

  // Fonts
  vars["--font-body"] = fontMap[theme.fontBody]?.family || fontMap.Inter?.family || FONT_MAP.Inter.family
  vars["--font-heading"] = fontMap[theme.fontHeading]?.family || fontMap.Orbitron?.family || FONT_MAP.Orbitron.family

  return vars
}

// ──────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────

export function cssVarsToString(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([key, value]) => `${key}:${value};`)
    .join("")
}

export function themeToDataAttributes(theme: ThemeConfig): Record<string, string> {
  return {
    "data-header": theme.headerSticky ? "sticky" : "static",
    "data-header-style": theme.headerStyle,
    "data-bg-type": theme.backgroundType,
  }
}
