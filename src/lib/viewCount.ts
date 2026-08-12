const WINDOW_MS = 24 * 60 * 60 * 1000

type ViewCacheEntry = {
  ts: number
}

function cacheKey(key: string): string {
  return `linyashare:view:${key}`
}

export function shouldCountView(key: string): boolean {
  if (typeof window === "undefined") return true
  try {
    const raw = localStorage.getItem(cacheKey(key))
    if (!raw) return true
    const entry = JSON.parse(raw) as ViewCacheEntry
    if (typeof entry?.ts !== "number") return true
    return Date.now() - entry.ts >= WINDOW_MS
  } catch {
    return true
  }
}

export function markViewCounted(key: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(cacheKey(key), JSON.stringify({ ts: Date.now() }))
  } catch {}
}