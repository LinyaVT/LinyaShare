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
// ANIMATED BACKGROUND COMPONENT
// ──────────────────────────────────────────────────────────
export default function AnimatedBackground({ theme }: { theme?: ThemeConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const animationIdRef = useRef<number>(0)
  const timeRef = useRef<number>(0)
  const colorRef = useRef<RGB>({ r: 236, g: 72, b: 153 })
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
    const count = Math.min(400, Math.max(200, Math.floor((width * height) / 5000)))
    const particles: Particle[] = []
    for (let i = 0; i < count; i++) {
      const baseSize = 1.5 + Math.random() * 3.5
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        baseSize,
        size: baseSize,
        baseAlpha: 0.08 + Math.random() * 0.25,
        alpha: 0.08 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.6,
      })
    }
    particlesRef.current = particles
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
    const mouse = mouseRef.current
    const now = Date.now()
    timeRef.current = now
    const col = colorRef.current

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

      // Pulsierende Opazität
      const pulse = Math.sin(now * 0.001 * p.speed * 0.5 + p.phase)
      p.alpha = p.baseAlpha + (pulse * 0.08)

      // Mouse Interaction
      const dx = mouse.x - p.x
      const dy = mouse.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const maxDist = 200

      if (dist < maxDist) {
        const force = (1 - dist / maxDist) * 0.8
        p.size = p.baseSize + force * 4
        p.alpha = Math.min(p.baseAlpha + force * 0.4, 0.7)

        // Leichtes Ausweichen
        const angle = Math.atan2(dy, dx)
        p.x -= Math.cos(angle) * force * 1.5
        p.y -= Math.sin(angle) * force * 1.5
      } else {
        p.size += (p.baseSize - p.size) * 0.05
      }

      // Draw particle
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${p.alpha})`
      ctx.fill()

      // Leichter Glow um grössere Partikel
      if (p.size > 3) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 1.8, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${p.alpha * 0.15})`
        ctx.fill()
      }
    }

    // ── Connection Lines ──
    ctx.lineWidth = 0.6
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i]
        const b = particles[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxLineDist = 150

        if (dist < maxLineDist) {
          const lineAlpha = (1 - dist / maxLineDist) * 0.18

          // Mouse closeness also brightens lines
          const avgX = (a.x + b.x) / 2
          const avgY = (a.y + b.y) / 2
          const mdx = mouse.x - avgX
          const mdy = mouse.y - avgY
          const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy)
          const mouseBoost = mouseDist < 300 ? (1 - mouseDist / 300) * 0.2 : 0

          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${Math.min(lineAlpha + mouseBoost, 0.5)})`
          ctx.stroke()
        }
      }
    }

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
