'use client'

import { useEffect, useRef } from 'react'

const SYMMETRY = 4
const COUNT = 55
const MAX_DIST = 130
const MOUSE_DIST = 160

interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    r: number
}

export default function ParticleBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const mouse = useRef({ x: -999, y: -999 })
    const particles = useRef<Particle[]>([])
    const raf = useRef<number>(0)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!

        const resize = () => {
            canvas.width = canvas.offsetWidth
            canvas.height = canvas.offsetHeight
            initParticles()
        }

        const initParticles = () => {
            const W = canvas.width, H = canvas.height
            particles.current = Array.from({ length: COUNT }, () => ({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                r: Math.random() * 1.5 + 0.8,
            }))
        }

        const symOp = (
            fn: (rx1: number, ry1: number, rx2?: number, ry2?: number) => void,
            x1: number, y1: number, x2?: number, y2?: number
        ) => {
            const cx = canvas.width / 2, cy = canvas.height / 2
            const ang = (Math.PI * 2) / SYMMETRY
            for (let i = 0; i < SYMMETRY; i++) {
                const a = ang * i
                const cos = Math.cos(a), sin = Math.sin(a)
                const rx1 = cx + (x1 - cx) * cos - (y1 - cy) * sin
                const ry1 = cy + (x1 - cx) * sin + (y1 - cy) * cos
                if (x2 !== undefined && y2 !== undefined) {
                    const rx2 = cx + (x2 - cx) * cos - (y2 - cy) * sin
                    const ry2 = cy + (x2 - cx) * sin + (y2 - cy) * cos
                    fn(rx1, ry1, rx2, ry2)
                } else {
                    fn(rx1, ry1)
                }
            }
        }

        const draw = () => {
            const W = canvas.width, H = canvas.height
            ctx.clearRect(0, 0, W, H)

            const mx = mouse.current.x, my = mouse.current.y

            for (let i = 0; i < particles.current.length; i++) {
                const p = particles.current[i]

                // mouse attraction
                const mdx = p.x - mx, mdy = p.y - my
                const md = Math.hypot(mdx, mdy)
                if (md < MOUSE_DIST && md > 0) {
                    const force = ((MOUSE_DIST - md) / MOUSE_DIST) * 0.6
                    p.vx -= (mdx / md) * force * 0.4
                    p.vy -= (mdy / md) * force * 0.4
                }

                p.vx *= 0.97
                p.vy *= 0.97
                p.x += p.vx
                p.y += p.vy

                if (p.x < 0) { p.x = 0; p.vx *= -1 }
                if (p.x > W) { p.x = W; p.vx *= -1 }
                if (p.y < 0) { p.y = 0; p.vy *= -1 }
                if (p.y > H) { p.y = H; p.vy *= -1 }

                // lines between particles
                for (let j = i + 1; j < particles.current.length; j++) {
                    const q = particles.current[j]
                    const d = Math.hypot(p.x - q.x, p.y - q.y)
                    if (d < MAX_DIST) {
                        const alpha = (1 - d / MAX_DIST) * 0.6
                        symOp((rx1, ry1, rx2, ry2) => {
                            ctx.beginPath()
                            ctx.moveTo(rx1, ry1)
                            ctx.lineTo(rx2!, ry2!)
                            ctx.strokeStyle = `rgba(100,80,50,${alpha})`
                            ctx.lineWidth = 0.6
                            ctx.stroke()
                        }, p.x, p.y, q.x, q.y)
                    }
                }

                // line to mouse
                if (md < MOUSE_DIST && md > 0) {
                    const alpha = (1 - md / MOUSE_DIST) * 0.85
                    symOp((rx1, ry1, rx2, ry2) => {
                        ctx.beginPath()
                        ctx.moveTo(rx1, ry1)
                        ctx.lineTo(rx2!, ry2!)
                        ctx.strokeStyle = `rgba(100,80,50,${alpha})`
                        ctx.lineWidth = 0.6
                        ctx.stroke()
                    }, p.x, p.y, mx, my)
                }

                // dots
                symOp((rx, ry) => {
                    ctx.beginPath()
                    ctx.arc(rx, ry, p.r, 0, Math.PI * 2)
                    ctx.fillStyle = 'rgba(100,80,50,0.7)'
                    ctx.fill()
                }, p.x, p.y)
            }

            raf.current = requestAnimationFrame(draw)
        }

        const onMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect()
            mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
        }
        const onMouseLeave = () => { mouse.current = { x: -999, y: -999 } }

        const ro = new ResizeObserver(resize)
        ro.observe(canvas)
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseleave', onMouseLeave)
        resize()
        draw()

        return () => {
            cancelAnimationFrame(raf.current)
            ro.disconnect()
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseleave', onMouseLeave)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className='absolute inset-0 w-full h-full pointer-events-none'
            style={{ zIndex: 0 }}
        />
    )
}