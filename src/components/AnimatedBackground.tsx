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
}

interface RGB {
  r: number
  g: number
  b: number
}

// ──────────────────────────────────────────────────────────
// TRANSFER TYPE ("file being sent between two connected nodes")
// a / b reference live particle indices, so the transfer moves with them
// ──────────────────────────────────────────────────────────
interface Packet {
  a: number
  b: number
  t: number
  holdT: number
  fadeT: number
  pulseT: number
  speed: number
  width: number
  spawnPulse: number
}

// Maximum distance a connected pair may drift apart before the transfer ends.
// Keeps connection lines short and on screen.
const MAX_TRANSFER_DIST = 180

// ──────────────────────────────────────────────────────────
// ANIMATED BACKGROUND COMPONENT
// ──────────────────────────────────────────────────────────
export default function AnimatedBackground({ theme }: { theme?: ThemeConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const packetsRef = useRef<Packet[]>([])
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
      })
    }
    particlesRef.current = particles
    packetsRef.current = []
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
    const packets = packetsRef.current
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

    // ── Frame delta (for packet movement) ──
    const dt = Math.min(now - lastTimeRef.current || 16, 100)
    lastTimeRef.current = now

    // ── Spawn a transfer between two connected nodes ──
    // When two particles are close ("found each other"), they start a transfer.
    // The pair stays connected (live) until the transfer has finished.
    const spawnTransfer = (): Packet | null => {
      if (particles.length < 2) return null
      const aIdx = Math.floor(Math.random() * particles.length)
      let bIdx = -1
      let bestD2 = Infinity
      for (let j = 0; j < particles.length; j++) {
        if (j === aIdx) continue
        const dx = particles[aIdx].x - particles[j].x
        const dy = particles[aIdx].y - particles[j].y
        const d2 = dx * dx + dy * dy
        if (d2 < bestD2) {
          bestD2 = d2
          bIdx = j
        }
      }
      if (bIdx < 0 || bestD2 > 150 * 150) return null
      // don't start a second transfer on the same pair
      for (const pk of packets) {
        if ((pk.a === aIdx && pk.b === bIdx) || (pk.a === bIdx && pk.b === aIdx)) return null
      }
      return {
        a: aIdx,
        b: bIdx,
        t: 0,
        holdT: 0,
        fadeT: -1,
        pulseT: -1,
        speed: 55 + Math.random() * 80,
        width: 2 + Math.random() * 0.8,
        spawnPulse: 0,
      }
    }

    if (packets.length < 5 && Math.random() < 0.04) {
      const transfer = spawnTransfer()
      if (transfer) packets.push(transfer)
    }

    // ── Update & Draw Transfers ──
    // The two nodes stay connected while the transfer runs; positions are read
    // live from the particles every frame, so everything moves together.
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

    for (let k = packets.length - 1; k >= 0; k--) {
      const pk = packets[k]
      const pa = particles[pk.a]
      const pb = particles[pk.b]
      if (!pa || !pb) {
        packets.splice(k, 1)
        continue
      }
      const ax = pa.x
      const ay = pa.y
      const bx = pb.x
      const by = pb.y

      // Shortest wrapped distance between the two nodes. Using the wrapped
      // vector keeps lines short and never crossing the whole screen, even
      // when a particle wraps around an edge.
      let dx = bx - ax
      let dy = by - ay
      if (dx > width / 2) dx -= width
      else if (dx < -width / 2) dx += width
      if (dy > height / 2) dy -= height
      else if (dy < -height / 2) dy += height
      const dist = Math.hypot(dx, dy)
      const ex = ax + dx
      const ey = ay + dy

      const dimA = centerDim(ax, ay)
      const dimB = centerDim(ex, ey)
      const dimAvg = (dimA + dimB) / 2

      // Limit: if the pair drifts too far apart, end the connection before
      // the line gets too long.
      if (dist > MAX_TRANSFER_DIST && pk.fadeT < 0) pk.fadeT = 0

      // Start pulse at the sender ("transfer begins")
      if (pk.spawnPulse < 1) {
        pk.spawnPulse += (dt / 1000) / 0.45
        const p = Math.min(pk.spawnPulse, 1)
        ctx.beginPath()
        ctx.arc(ax, ay, p * 26, 0, Math.PI * 2)
        ctx.lineWidth = 1.5
        ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${(1 - p) * 0.5 * dimA})`
        ctx.stroke()
      }

      // Arrival pulse at the receiver ("received")
      if (pk.pulseT >= 0) {
        pk.pulseT += (dt / 1000) / 0.5
        const p = Math.min(pk.pulseT, 1)
        ctx.beginPath()
        ctx.arc(ex, ey, p * 28, 0, Math.PI * 2)
        ctx.lineWidth = 2
        ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${(1 - p) * 0.6 * dimB})`
        ctx.stroke()
      }

      if (pk.fadeT >= 0) {
        // Finishing: the connection retracts from the sender side toward the
        // receiver, then the pair separates.
        pk.fadeT += (dt / 1000) / 0.6
        const f = Math.min(pk.fadeT, 1)
        const sx = ax + dx * f
        const sy = ay + dy * f
        if (sx !== ex || sy !== ey) {
          drawConnection(sx, sy, ex, ey, 0.5 * dimB)
          drawDash(sx, sy, ex, ey, 0.75 * dimB, pk.width)
        }
        if (pk.fadeT >= 1) {
          packets.splice(k, 1)
          continue
        }
      } else if (pk.t < 1) {
        // Sending: the pair is strongly connected, the dashed line grows from
        // the sender toward the receiver (both moving together).
        const len = dist || 1
        pk.t += ((dt / 1000) * pk.speed) / len
        if (pk.t >= 1) {
          pk.t = 1
          pk.holdT = 0
          pk.pulseT = 0
        }
        const tx = ax + dx * pk.t
        const ty = ay + dy * pk.t
        drawConnection(ax, ay, ex, ey, 0.35 * dimAvg)
        drawDash(ax, ay, tx, ty, 0.75 * dimA, pk.width)
      } else {
        // Arrived: the full connection stays visible for a short hold, then the
        // transfer finishes and the pair separates.
        pk.holdT += dt / 1000
        drawConnection(ax, ay, ex, ey, 0.35 * dimAvg)
        drawDash(ax, ay, ex, ey, 0.75 * dimAvg, pk.width)
        if (pk.holdT >= 0.35) pk.fadeT = 0
      }
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
      const alpha = p.alpha * dim

      // Draw particle
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${alpha})`
      ctx.fill()

      // Leichter Glow um grössere Partikel
      if (p.size > 3) {
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
