'use client'

import { useEffect, useRef } from 'react'

export default function DotParticleBackground({ isLight }: { isLight: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const mouse = useRef({ x: -9999, y: -9999 })
  const smoothMouse = useRef({ x: -9999, y: -9999 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    // ── Tune these ─────────────────────────────────────────────
    const SPACING = 12        // was 28. Lower = tighter pointillism (try 10-14)
    const DOT_RADIUS = 0.8    // was 1.4. Smaller = finer dots
    const BASE_ALPHA = 0.13   // was 0.25. Lower = duller, more subtle
    const GLOW_ALPHA = 0.6    // extra opacity added right under the cursor
    const GLOW_GROW = 0.7     // extra radius (px) under the cursor, dots swell slightly
    const RADIUS = 140        // glow reach around the cursor (unchanged)
    // ───────────────────────────────────────────────────────────

    const isMobile = window.matchMedia('(pointer: coarse)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let cols = 0, rows = 0, w = 0, h = 0

    const init = () => {
      cancelAnimationFrame(rafRef.current)
      w = canvas.offsetWidth
      h = canvas.offsetHeight
      // render at device pixel ratio so tiny dots stay crisp instead of blurry
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.ceil(w / SPACING) + 2
      rows = Math.ceil(h / SPACING) + 2
      rafRef.current = requestAnimationFrame(draw)
    }

    const draw = () => {
      smoothMouse.current.x += (mouse.current.x - smoothMouse.current.x) * 0.1
      smoothMouse.current.y += (mouse.current.y - smoothMouse.current.y) * 0.1

      ctx.clearRect(0, 0, w, h)

      const mx = smoothMouse.current.x
      const my = smoothMouse.current.y
      const dotColor = isLight ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,1)'
      const r2 = RADIUS * RADIUS

      ctx.fillStyle = dotColor

      // Pass 1: every dot OUTSIDE the glow, batched into ONE path (much faster with dense dots)
      ctx.globalAlpha = BASE_ALPHA
      ctx.beginPath()
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * SPACING - SPACING
          const y = row * SPACING - SPACING
          const dx = x - mx
          const dy = y - my
          if (dx * dx + dy * dy < r2) continue // glow pass handles these
          ctx.moveTo(x + DOT_RADIUS, y)
          ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2)
        }
      }
      ctx.fill()

      // Pass 2: only the dots inside the glow radius, each with its own alpha + size
      if (mx > -1000) {
        for (let row = 0; row < rows; row++) {
          const y = row * SPACING - SPACING
          if (Math.abs(y - my) > RADIUS) continue
          for (let col = 0; col < cols; col++) {
            const x = col * SPACING - SPACING
            const dx = x - mx
            const dy = y - my
            const d2 = dx * dx + dy * dy
            if (d2 >= r2) continue

            const t = 1 - Math.sqrt(d2) / RADIUS // 1 at cursor, 0 at the edge
            ctx.globalAlpha = BASE_ALPHA + GLOW_ALPHA * t
            ctx.beginPath()
            ctx.arc(x, y, DOT_RADIUS + GLOW_GROW * t, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(draw)
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      // first move after leaving: snap instead of gliding in from off-screen
      if (smoothMouse.current.x < -1000) {
        smoothMouse.current = { ...mouse.current }
      }
    }
    const onLeave = () => {
      mouse.current = { x: -9999, y: -9999 }
      smoothMouse.current = { x: -9999, y: -9999 }
    }

    if (!isMobile) {
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseleave', onLeave)
    }

    const ro = new ResizeObserver(init)
    ro.observe(canvas)
    init()

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      if (!isMobile) {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseleave', onLeave)
      }
    }
  }, [isLight])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}