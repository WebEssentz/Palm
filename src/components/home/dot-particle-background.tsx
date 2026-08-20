'use client'

import { useEffect, useRef } from 'react'

export default function ParticleBackground({ isLight }: { isLight: boolean }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const rafRef      = useRef<number>(0)
  const mouse       = useRef({ x: -9999, y: -9999 })
  const smoothMouse = useRef({ x: -9999, y: -9999 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const SPACING = 28
    const RADIUS  = 140
    const PUSH    = 140

    const isMobile = window.matchMedia('(pointer: coarse)').matches

    let cols = 0, rows = 0

    const init = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      cols = Math.ceil(canvas.width  / SPACING) + 2
      rows = Math.ceil(canvas.height / SPACING) + 2
    }

    const draw = () => {
      smoothMouse.current.x += (mouse.current.x - smoothMouse.current.x) * 0.1
      smoothMouse.current.y += (mouse.current.y - smoothMouse.current.y) * 0.1

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const mx = smoothMouse.current.x
      const my = smoothMouse.current.y
      const dotColor = isLight ? 'rgba(0,0,0,0.92)' : 'rgba(255,255,255,0.92)'

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const ox = col * SPACING - SPACING
          const oy = row * SPACING - SPACING
          const dx   = ox - mx
          const dy   = oy - my
          const dist = Math.sqrt(dx * dx + dy * dy)

          let wx = ox, wy = oy, alpha = 0.25

          if (dist < RADIUS && dist > 0) {
            const t     = 1 - dist / RADIUS
            const shove = t * t * PUSH
            const nx    = dx / dist
            const ny    = dy / dist
            wx = ox + nx * shove
            wy = oy + ny * shove
            alpha = dist < RADIUS * 0.3
              ? 0
              : 0.55 * ((dist - RADIUS * 0.3) / (RADIUS * 0.7))
          }

          ctx.globalAlpha = alpha
          ctx.fillStyle   = dotColor
          ctx.beginPath()
          ctx.arc(wx, wy, 1.4, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.globalAlpha = 1
      rafRef.current  = requestAnimationFrame(draw)
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const onLeave = () => {
      mouse.current       = { x: -9999, y: -9999 }
      smoothMouse.current = { x: -9999, y: -9999 }
    }

    if (!isMobile) {
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseleave', onLeave)
    }

    const ro = new ResizeObserver(init)
    ro.observe(canvas)
    init(); draw()

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