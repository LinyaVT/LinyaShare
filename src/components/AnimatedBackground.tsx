"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { ThemeConfig } from "@/lib/theme"

// ──────────────────────────────────────────────────────────
// PARTICLE TYPES
// ──────────────────────────────────────────────────────────
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  baseSize: number
  size: number
  baseAlpha: number
  alpha: number
  phase: number
  speed: number
  glow: number
}

interface RGB {
  r: number
  g: number
  b: number
}

// ──────────────────────────────────────────────────────────
// TOKEN TYPE ("a file being handed from person to person")
// `at` references a live particle index, so the packet moves with them.
// The holder glows; after a short hold it passes the packet on to a
// connected neighbour, dims, and the receiver starts to glow.
// ──────────────────────────────────────────────────────────
interface Token {
  at: number
  prev: number
  holdT: number
  state: "hold" | "send" | "dissolve"
  target: number
  sendT: number
  dissolveT: number
  lifetime: number
  speed: number
}

// Number of packets hopping through the network at the same time
const TOKEN_COUNT = 6
// How far apart two particles must be to be considered "connected"
const CONNECT_DIST = 150
// Maximum length a send connection may reach before it aborts
const MAX_TRANSFER_DIST = 180
// How long a node holds the packet before passing it on
const HOLD_DUR = 1.6
// How long a packet lives before it dissolves (a new one then spawns elsewhere)
const TOKEN_LIFETIME = 10
// How long the fade-out / dissolve effect lasts
const DISSOLVE_DUR = 1.1

// ──────────────────────────────────────────────────────────
// ANIMATED BACKGROUND COMPONENT
// ──────────────────────────────────────────────────────────
export default function AnimatedBackground({ theme }: { theme?: ThemeConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const tokensRef = useRef<Token[]>([])
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const animationIdRef = useRef<number>(0)
  const timeRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const colorRef = useRef<RGB>({ r: 236, g: 72, b: 153 })
  const reduceMotionRef = useRef(false)
  const enabledRef = useRef((theme?.backgroundType ?? "particles") === "particles")
  const [enabled, setEnabled] = useState(enabledRef.current)

  // Farb- & Aktiv-Sync: liest CSS-Variablen + data-attribut vom <html>
  // (so reagiert die Vorschau im Admin-Settings live auf Änderungen)
  const syncFromDom = useCallback(() => {
    const root = document.documentElement

    const raw = getComputedStyle(root).getPropertyValue("--particle-color").trim()
    if (raw) {
      const parts = raw.split(/\s+/).map(Number)
      if (parts.length >= 3 && parts.slice(0, 3).every((n) => !isNaN(n))) {
        colorRef.current = { r: parts[0], g: parts[1], b: parts[2] }
      }
    }

    const type = root.dataset.bgType
    const next = type ? type === "particles" : (theme?.backgroundType ?? "particles") === "particles"
    if (next !== enabledRef.current) {
      enabledRef.current = next
      setEnabled(next)
    }
  }, [theme?.backgroundType])

  const initParticles = useCallback((width: number, height: number) => {
    const count = Math.min(260, Math.max(140, Math.floor((width * height) / 6500)))
    const particles: Particle[] = []
    for (let i = 0; i < count; i++) {
      const baseSize = 1.5 + Math.random() * 3
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        baseSize,
        size: baseSize,
        baseAlpha: 0.06 + Math.random() * 0.16,
        alpha: 0.06 + Math.random() * 0.16,
        phase: Math.random() * Math.PI * 2,
        speed: 0.15 + Math.random() * 0.45,
        glow: 0,
      })
    }
    particlesRef.current = particles

    // Give the first TOKEN_COUNT particles a packet at random -> they glow.
    const n = Math.min(TOKEN_COUNT, particles.length)
    const indices = new Set<number>()
    while (indices.size < n) {
      indices.add(Math.floor(Math.random() * particles.length))
    }
    const tokens: Token[] = []
    for (const idx of indices) {
      tokens.push({
        at: idx,
        prev: -1,
        holdT: Math.random() * HOLD_DUR * 0.5,
        state: "hold",
        target: -1,
        sendT: 0,
        dissolveT: 0,
        lifetime: Math.random() * TOKEN_LIFETIME * 0.4,
        speed: 60 + Math.random() * 80,
      })
    }
    tokensRef.current = tokens
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear
    ctx.clearRect(0, 0, width, height)

    const particles = particlesRef.current
    const tokens = tokensRef.current
    const mouse = mouseRef.current
    const now = Date.now()
    timeRef.current = now
    const col = colorRef.current

    // Center vignette: dim everything near the viewport center so
    // content stays readable (particles only really "live" in the frame).
    const cx = width / 2
    const cy = height / 2
    const maxR = Math.hypot(cx, cy)
    const centerDim = (x: number, y: number) => {
      const r = Math.hypot(x - cx, y - cy) / maxR
      const safe = Math.min(1, Math.max(0, (r - 0.15) / 0.45))
      return 0.45 + 0.55 * safe
    }

    // ── Frame delta ──
    const dt = Math.min(now - lastTimeRef.current || 16, 100)
    lastTimeRef.current = now

    // Shortest wrapped distance between two points (keeps lines short and on
    // screen, even when a particle wraps around an edge).
    const wrappedDelta = (x1: number, y1: number, x2: number, y2: number) => {
      let dx = x2 - x1
      let dy = y2 - y1
      if (dx > width / 2) dx -= width
      else if (dx < -width / 2) dx += width
      if (dy > height / 2) dy -= height
      else if (dy < -height / 2) dy += height
      return { dx, dy, dist: Math.hypot(dx, dy) }
    }

    // Pick the next connected neighbour to pass the packet to.
    // Avoids the previous sender (no ping-pong) and any node that is already
    // holding or receiving another packet; falls back to any connected node.
    const pickTarget = (tk: Token): number => {
      const A = particles[tk.at]
      if (!A) return -1
      const busy = new Set<number>()
      for (const o of tokens) {
        busy.add(o.at)
        if (o.state === "send" && o.target >= 0) busy.add(o.target)
      }

      let bestIdx = -1
      let bestD2 = Infinity
      for (let j = 0; j < particles.length; j++) {
        if (j === tk.at || busy.has(j) || j === tk.prev) continue
        const { dist } = wrappedDelta(A.x, A.y, particles[j].x, particles[j].y)
        if (dist > CONNECT_DIST) continue
        if (dist < bestD2) {
          bestD2 = dist
          bestIdx = j
        }
      }
      if (bestIdx >= 0) return bestIdx

      // Fallback: ignore the "previous sender" rule to avoid stalls.
      let fallbackIdx = -1
      let fallbackD2 = Infinity
      for (let j = 0; j < particles.length; j++) {
        if (j === tk.at || busy.has(j)) continue
        const { dist } = wrappedDelta(A.x, A.y, particles[j].x, particles[j].y)
        if (dist > CONNECT_DIST) continue
        if (dist < fallbackD2) {
          fallbackD2 = dist
          fallbackIdx = j
        }
      }
      return fallbackIdx
    }

    // Pick a random free node where a dissolved packet reappears.
    const pickSpawn = (tk: Token): number => {
      const busy = new Set<number>()
      for (const o of tokens) {
        busy.add(o.at)
        if (o.state === "send" && o.target >= 0) busy.add(o.target)
      }
      const free: number[] = []
      for (let j = 0; j < particles.length; j++) {
        if (j === tk.at || busy.has(j)) continue
        free.push(j)
      }
      if (free.length === 0) return tk.at
      return free[Math.floor(Math.random() * free.length)]
    }

    const dashFlow = now * 0.001 * 26
    const drawDash = (
      x1: number, y1: number, x2: number, y2: number,
      alpha: number, width: number, lineDash: number[] = [7, 9]
    ) => {
      ctx.save()
      ctx.setLineDash(lineDash)
      ctx.lineDashOffset = -dashFlow
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.lineWidth = width
      ctx.lineCap = "round"
      ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${alpha})`
      ctx.stroke()
      ctx.restore()
    }
    const drawConnection = (x1: number, y1: number, x2: number, y2: number, alpha: number) => {
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.lineWidth = 1.4
      ctx.lineCap = "round"
      ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${alpha})`
      ctx.stroke()
    }

    // ── Update & Draw Tokens (packets hopping through the network) ──
    for (const tk of tokens) {
      const A = particles[tk.at]
      if (!A) continue
      const ax = A.x
      const ay = A.y
      const dimA = centerDim(ax, ay)

      // ── Dissolving: the packet fades out, then a new one spawns elsewhere ──
      if (tk.state === "dissolve") {
        tk.dissolveT += dt / 1000
        const p = Math.min(tk.dissolveT / DISSOLVE_DUR, 1)
        const fade = 1 - p

        ctx.beginPath()
        ctx.arc(ax, ay, 6 + p * 20, 0, Math.PI * 2)
        ctx.lineWidth = 1.5
        ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${fade * 0.6 * dimA})`
        ctx.stroke()

        if (fade > 0) {
          ctx.beginPath()
          ctx.arc(ax, ay, 15 * fade, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${fade * 0.12 * dimA})`
          ctx.fill()
        }

        if (p >= 1) {
          const idx = pickSpawn(tk)
          tk.at = idx
          tk.prev = -1
          tk.holdT = Math.random() * HOLD_DUR * 0.5
          tk.state = "hold"
          tk.target = -1
          tk.sendT = 0
          tk.dissolveT = 0
          tk.lifetime = 0
        }
        continue
      }

      // Lifetime: after a while the packet dissolves instead of hopping forever.
      tk.lifetime += dt / 1000
      if (tk.lifetime >= TOKEN_LIFETIME) {
        tk.state = "dissolve"
        tk.dissolveT = 0
        continue
      }

      if (tk.state === "hold") {
        tk.holdT += dt / 1000
        if (tk.holdT >= HOLD_DUR) {
          const target = pickTarget(tk)
          if (target >= 0) {
            tk.state = "send"
            tk.target = target
            tk.sendT = 0
          } else {
            // no free neighbour right now -> keep holding, retry next frame
            tk.holdT = HOLD_DUR * 0.9
          }
        }
      } else {
        const B = particles[tk.target]
        if (!B) {
          tk.state = "hold"
          tk.holdT = 0
          continue
        }
        const { dx, dy, dist } = wrappedDelta(ax, ay, B.x, B.y)
        const ex = ax + dx
        const ey = ay + dy
        const dimAvg = (dimA + centerDim(ex, ey)) / 2

        // Abort the send if the receiver drifted too far -> pick another target
        if (dist > MAX_TRANSFER_DIST) {
          const target = pickTarget(tk)
          if (target >= 0) {
            tk.target = target
            tk.sendT = 0
          } else {
            tk.state = "hold"
            tk.holdT = HOLD_DUR * 0.9
          }
          continue
        }

        const len = dist || 1
        tk.sendT += ((dt / 1000) * tk.speed) / len
        if (tk.sendT >= 1) {
          // Arrival: the receiver takes over the packet, the sender dims.
          const sender = tk.at
          tk.at = tk.target
          tk.prev = sender
          tk.state = "hold"
          tk.holdT = 0
          tk.target = -1
          tk.sendT = 0
          continue
        }

        const tx = ax + dx * tk.sendT
        const ty = ay + dy * tk.sendT
        drawConnection(ax, ay, ex, ey, 0.35 * dimAvg)
        drawDash(ax, ay, tx, ty, 0.75 * dimA, 2.2)
      }
    }

    const holders = new Set<number>()
    for (const tk of tokens) {
      // A dissolving packet has left the node -> it stops glowing while fading.
      if (tk.state === "dissolve") continue
      holders.add(tk.at)
    }

    // ── Update & Draw Particles ──
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]

      // Bewegung: sanfte Drift + Sinus-Animation
      const t = now * 0.001 * p.speed
      p.x += Math.sin(t + p.phase) * 0.3 + p.vx * 0.5
      p.y += Math.cos(t * 0.7 + p.phase) * 0.3 + p.vy * 0.5

      // Wrap around edges
      if (p.x < -20) p.x = width + 20
      if (p.x > width + 20) p.x = -20
      if (p.y < -20) p.y = height + 20
      if (p.y > height + 20) p.y = -20

      // Pulsierende Opazität + Grösse (sanftes "Atmen")
      const pulse = Math.sin(now * 0.001 * p.speed * 0.5 + p.phase)
      p.alpha = p.baseAlpha + (pulse * 0.1)
      const pulsedBase = p.baseSize * (1 + pulse * 0.22)

      // Mouse Interaction
      const dx = mouse.x - p.x
      const dy = mouse.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const maxDist = 200

      if (dist < maxDist) {
        const force = (1 - dist / maxDist) * 0.6
        p.size = pulsedBase + force * 3
        p.alpha = Math.min(p.alpha + force * 0.35, 0.6)

        // Leichtes Ausweichen
        const angle = Math.atan2(dy, dx)
        p.x -= Math.cos(angle) * force * 1.5
        p.y -= Math.sin(angle) * force * 1.5
      } else {
        p.size += (pulsedBase - p.size) * 0.05
      }

      const dim = centerDim(p.x, p.y)

      // Smooth brightness: eases towards 1 while the node holds a packet and
      // back to 0 after it hands it on, so the giver dims and the receiver
      // brightens gently instead of switching instantly.
      const targetGlow = holders.has(i) ? 1 : 0
      p.glow += (targetGlow - p.glow) * Math.min(1, (dt / 1000) * 4)
      const glow = p.glow

      const alpha = p.alpha * dim * (1 + glow * 0.8)
      const coreSize = p.size * (1 + glow * 0.7)

      // Draw particle
      ctx.beginPath()
      ctx.arc(p.x, p.y, coreSize, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${alpha})`
      ctx.fill()

      if (glow > 0.02) {
        // Soft halo + static ring around the node currently holding a packet
        const haloR = 11 + glow * 3
        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloR)
        halo.addColorStop(0, `rgba(${col.r}, ${col.g}, ${col.b}, ${0.4 * glow * dim})`)
        halo.addColorStop(1, `rgba(${col.r}, ${col.g}, ${col.b}, 0)`)
        ctx.beginPath()
        ctx.arc(p.x, p.y, haloR, 0, Math.PI * 2)
        ctx.fillStyle = halo
        ctx.fill()

        ctx.beginPath()
        ctx.arc(p.x, p.y, 15, 0, Math.PI * 2)
        ctx.lineWidth = 1.5
        ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${0.5 * glow * dim})`
        ctx.stroke()
      } else if (p.size > 3) {
        // Leichter Glow um grössere Partikel
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 1.8, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${alpha * 0.15})`
        ctx.fill()
      }
    }

    // ── Connection Lines ──
    ctx.lineWidth = 0.5
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i]
        const b = particles[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxLineDist = 150

        if (dist < maxLineDist) {
          const lineAlpha = (1 - dist / maxLineDist) * 0.14

          // Mouse closeness also brightens lines
          const avgX = (a.x + b.x) / 2
          const avgY = (a.y + b.y) / 2
          const mdx = mouse.x - avgX
          const mdy = mouse.y - avgY
          const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy)
          const mouseBoost = mouseDist < 300 ? (1 - mouseDist / 300) * 0.16 : 0

          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${Math.min((lineAlpha + mouseBoost) * centerDim(avgX, avgY), 0.4)})`
          ctx.stroke()
        }
      }
    }

    if (reduceMotionRef.current) return
    animationIdRef.current = requestAnimationFrame(draw)
  }, [])

  // ── Resize Handler ──
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const width = window.innerWidth
    const height = window.innerHeight

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext("2d")
    if (ctx) ctx.scale(dpr, dpr)

    initParticles(width, height)
  }, [initParticles])

  useEffect(() => {
    syncFromDom()

    const intervalId = setInterval(syncFromDom, 400)
    return () => clearInterval(intervalId)
  }, [syncFromDom])

  useEffect(() => {
    if (!enabled) return

    reduceMotionRef.current =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches

    handleResize()
    window.addEventListener("resize", handleResize)
    window.addEventListener("mousemove", (e) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
    })
    window.addEventListener("mouseleave", () => {
      mouseRef.current.x = -9999
      mouseRef.current.y = -9999
    })

    draw()

    return () => {
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(animationIdRef.current)
    }
  }, [enabled, handleResize, draw])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    />
  )
}
