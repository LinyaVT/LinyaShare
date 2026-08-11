// ──────────────────────────────────────────────────────────
// LOGIN RATE LIMITING (in-memory)
// ──────────────────────────────────────────────────────────
// Tracks failed login attempts per key (IP + email) and blocks
// further attempts for a cooldown period once the limit is hit.
// This is an in-process store, which is fine for a single-instance
// self-hosted deployment.

type Entry = {
  count: number
  windowStart: number
  blockedUntil: number
}

const store = new Map<string, Entry>()

const MAX_ATTEMPTS = toInt(process.env.LOGIN_MAX_ATTEMPTS, 5)
const WINDOW_MS = toInt(process.env.LOGIN_WINDOW_SECONDS, 15 * 60) * 1000
const BLOCK_MS = toInt(process.env.LOGIN_BLOCK_SECONDS, 30 * 60) * 1000

function toInt(value: string | undefined, fallback: number): number {
  const parsed = value ? parseInt(value, 10) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Returns the number of milliseconds the key is still blocked for,
 * or 0 if the key is allowed to attempt login.
 */
export function getBlockRemaining(key: string): number {
  const entry = store.get(key)
  if (!entry) return 0

  const now = Date.now()
  if (entry.blockedUntil > now) {
    return entry.blockedUntil - now
  }

  if (entry.blockedUntil !== 0) {
    store.delete(key)
  }

  return 0
}

/**
 * Record a failed login attempt. Blocks the key once the attempt
 * limit is reached within the configured window.
 */
export function recordFailure(key: string): void {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry) {
    store.set(key, { count: 1, windowStart: now, blockedUntil: 0 })
    return
  }

  if (entry.blockedUntil > now) return

  if (entry.blockedUntil !== 0 || now - entry.windowStart > WINDOW_MS) {
    entry.count = 0
    entry.windowStart = now
    entry.blockedUntil = 0
  }

  entry.count += 1
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS
    entry.count = 0
  }
}

/**
 * Clear failed attempts for a key (e.g. after a successful login).
 */
export function clearAttempts(key: string): void {
  store.delete(key)
}

/**
 * Best-effort client IP extraction from the request passed to authorize().
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown"
  return request.headers.get("x-real-ip")?.trim() || "unknown"
}
