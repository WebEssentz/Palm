'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import ParticleBackground from '@/components/home/particle-background'
import { ThemeToggle } from '@/components/theme/toggle'
import { GlassTooltip } from '@/components/ui/glass-tooltip'
import Loading from '@/app/(protected)/dashboard/loading'

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM CURSOR
// ─────────────────────────────────────────────────────────────────────────────
function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const mouse   = useRef({ x: -100, y: -100 })
  const ring    = useRef({ x: -100, y: -100 })
  const hovered = useRef(false)

  useEffect(() => {
    const onMove = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY } }
    const onOver = (e: MouseEvent) => {
      if ((e.target as Element).closest('a,button,[data-cursor]')) hovered.current = true
    }
    const onOut = () => { hovered.current = false }

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)

    let raf: number
    const tick = () => {
      ring.current.x += (mouse.current.x - ring.current.x) * 0.1
      ring.current.y += (mouse.current.y - ring.current.y) * 0.1

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouse.current.x - 5}px, ${mouse.current.y - 5}px) scale(${hovered.current ? 1.8 : 1})`
      }
      if (ringRef.current) {
        const s = hovered.current ? 1.6 : 1
        ringRef.current.style.transform = `translate(${ring.current.x - 18}px, ${ring.current.y - 18}px) scale(${s})`
        ringRef.current.style.opacity = hovered.current ? '0.6' : '1'
      }
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <div ref={dotRef} style={{
        position: 'fixed', top: 0, left: 0, zIndex: 99999,
        width: 10, height: 10, borderRadius: '50%',
        background: '#A07850',
        pointerEvents: 'none', willChange: 'transform',
        transition: 'transform 0.08s ease',
        mixBlendMode: 'difference',
      }} />
      <div ref={ringRef} style={{
        position: 'fixed', top: 0, left: 0, zIndex: 99998,
        width: 36, height: 36, borderRadius: '50%',
        border: '1.5px solid rgba(160,120,80,0.5)',
        pointerEvents: 'none', willChange: 'transform',
        transition: 'opacity 0.2s',
      }} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// NAV — liquid glass pill that floats down on scroll
// ─────────────────────────────────────────────────────────────────────────────
function Nav({ isLight }: { isLight: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // SVG liquid glass filter id
  const filterId = isLight ? 'nav-glass-light' : 'nav-glass-dark'

  return (
    <>
      {/* Hidden SVG filters */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <defs>
          <filter id="nav-glass-dark" x="-10%" y="-40%" width="120%" height="180%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.65 0.42" numOctaves="3" seed="7" result="noise">
              <animate attributeName="baseFrequency" values="0.65 0.42;0.67 0.44;0.65 0.42" dur="10s" repeatCount="indefinite" />
            </feTurbulence>
            <feGaussianBlur in="noise" stdDeviation="1.2" result="blurNoise" />
            <feDisplacementMap in="SourceGraphic" in2="blurNoise" scale="8" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feComposite in="displaced" in2="SourceGraphic" operator="atop" />
          </filter>
          <filter id="nav-glass-light" x="-10%" y="-40%" width="120%" height="180%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.65 0.42" numOctaves="3" seed="7" result="noise">
              <animate attributeName="baseFrequency" values="0.65 0.42;0.67 0.44;0.65 0.42" dur="10s" repeatCount="indefinite" />
            </feTurbulence>
            <feGaussianBlur in="noise" stdDeviation="1.2" result="blurNoise" />
            <feDisplacementMap in="SourceGraphic" in2="blurNoise" scale="8" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feComposite in="displaced" in2="SourceGraphic" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{
            y: scrolled ? 16 : 0,
            opacity: 1,
            width: scrolled ? 'auto' : '100%',
          }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            pointerEvents: 'auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 40,
            padding: scrolled ? '10px 20px 10px 16px' : '18px 48px',
            borderRadius: scrolled ? 9999 : 0,
            background: scrolled
              ? (isLight ? 'rgba(245,240,232,0.72)' : 'rgba(10,10,10,0.72)')
              : 'transparent',
            backdropFilter: scrolled ? 'blur(24px)' : 'none',
            WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'none',
            border: scrolled
              ? (isLight ? '1px solid rgba(0,0,0,0.09)' : '1px solid rgba(255,255,255,0.10)')
              : '1px solid transparent',
            boxShadow: scrolled
              ? (isLight
                  ? '0 2px 24px rgba(0,0,0,0.09), inset 0 1px 0 rgba(255,255,255,0.55)'
                  : '0 2px 24px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.07)')
              : 'none',
            filter: scrolled ? `url(#${filterId})` : 'none',
            transition: 'padding 0.5s ease, border-radius 0.5s ease, background 0.4s ease, border 0.4s ease, box-shadow 0.4s ease',
            overflow: 'hidden',
          }}
        >
          {/* Specular streak — only when pill */}
          {scrolled && (
            <span aria-hidden="true" style={{
              position: 'absolute', top: 0, left: '8%', right: '8%', height: 1,
              background: isLight
                ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.70), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
              borderRadius: 9999, pointerEvents: 'none',
            }} />
          )}

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.88)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: isLight ? '#F5F0E8' : '#070707' }} />
            </div>
            <span style={{ color: isLight ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.70)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
              Palm
            </span>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {['Features', 'Pricing', 'Docs'].map(l => (
              <a key={l} href="#" style={{
                color: isLight ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.38)',
                fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em',
                transition: 'color 0.15s', textDecoration: 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = isLight ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.80)')}
              onMouseLeave={e => (e.currentTarget.style.color = isLight ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.38)')}
              >{l}</a>
            ))}
            <Link href="/auth/sign-up" style={{
              padding: '8px 18px', borderRadius: 9999,
              background: isLight ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.92)',
              color: isLight ? '#F5F0E8' : '#070707',
              fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em',
              textDecoration: 'none',
              transition: 'background 0.15s, transform 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              Get started
            </Link>
          </div>
        </motion.nav>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────────────────────
const HERO_WORDS = ['instantly.', 'effortlessly.', 'beautifully.', 'magically.']

function Hero({ isLight }: { isLight: boolean }) {
  const [wordIdx, setWordIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setWordIdx(i => (i + 1) % HERO_WORDS.length)
    }, 3200)
    return () => clearInterval(id)
  }, [])

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.13 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 36 },
    show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } },
  }

  const bg   = isLight ? '#F5F0E8' : '#070707'
  const text = isLight ? '#0a0a0a' : '#ffffff'
  const sub  = isLight ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.36)'

  return (
    <section style={{
      position: 'relative', minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', background: bg,
    }}>
      <ParticleBackground />

      {/* Radial glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: isLight
          ? 'radial-gradient(ellipse 55% 45% at 50% 65%, rgba(160,120,80,0.08) 0%, transparent 70%)'
          : 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(160,120,80,0.10) 0%, transparent 70%)',
      }} />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 24px', maxWidth: 900, margin: '0 auto' }}
      >
        {/* Headline — cycling word on its own line, no shift */}
        <motion.h1 variants={itemVariants} style={{
          fontSize: 'clamp(3rem, 7.5vw, 6.5rem)',
          fontWeight: 800, lineHeight: 1.04,
          letterSpacing: '-0.04em',
          color: text,
          margin: 0,
        }}>
          Turn ideas into interfaces,
          <br />
          <AnimatePresence mode="wait">
            <motion.span
              key={wordIdx}
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -14, filter: 'blur(6px)' }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{ color: '#A07850', display: 'inline-block' }}
            >
              {HERO_WORDS[wordIdx]}
            </motion.span>
          </AnimatePresence>
        </motion.h1>

        {/* Subline */}
        <motion.p variants={itemVariants} style={{
          marginTop: 28,
          fontSize: 'clamp(1rem, 2vw, 1.18rem)',
          color: sub,
          fontWeight: 400, lineHeight: 1.65,
          letterSpacing: '0.005em',
        }}>
          Describe what you want to build. Palm generates production-ready UI<br />
          that you can refine, export, and ship — no design tools required.
        </motion.p>

        {/* Single CTA */}
        <motion.div variants={itemVariants} style={{ marginTop: 44, display: 'flex', justifyContent: 'center' }}>
          <Link href="/auth/sign-up" style={{
            padding: '15px 38px', borderRadius: 9999,
            background: isLight ? '#0a0a0a' : '#ffffff',
            color: isLight ? '#F5F0E8' : '#070707',
            fontSize: 15, fontWeight: 700, letterSpacing: '-0.015em',
            textDecoration: 'none',
            boxShadow: isLight
              ? '0 4px 20px rgba(0,0,0,0.15)'
              : '0 0 0 1px rgba(255,255,255,0.1), 0 8px 40px rgba(0,0,0,0.4)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            display: 'inline-flex', alignItems: 'center', gap: 10,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
          >
            Start building free
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke={isLight ? '#F5F0E8' : '#070707'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1 }}
        style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 1, height: 40,
            background: isLight
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.0), rgba(0,0,0,0.20))'
              : 'linear-gradient(to bottom, rgba(255,255,255,0.0), rgba(255,255,255,0.22))',
            margin: '0 auto',
          }}
        />
      </motion.div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D CAMERA SECTION
// ─────────────────────────────────────────────────────────────────────────────
function CameraSection({ isLight }: { isLight: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const sp = useSpring(scrollYProgress, { stiffness: 60, damping: 20 })

  const rotateX    = useTransform(sp, [0, 0.55], [52, 0])
  const rotateY    = useTransform(sp, [0, 0.55], [-18, 0])
  const camZ       = useTransform(sp, [0, 0.65], [-900, 0])
  const sceneScale = useTransform(sp, [0, 0.65], [0.5, 1])
  const sceneOpac  = useTransform(sp, [0, 0.08, 0.9, 1], [0, 1, 1, 0])

  const titleY    = useTransform(sp, [0.1, 0.35], [30, 0])
  const titleOpac = useTransform(sp, [0.1, 0.35, 0.78, 0.90], [0, 1, 1, 0])
  const subOpac   = useTransform(sp, [0.28, 0.46, 0.80, 0.92], [0, 1, 1, 0])
  const subY      = useTransform(sp, [0.28, 0.46], [20, 0])
  const glowOpac  = useTransform(sp, [0.3, 0.6], [0, 1])

  const bg      = isLight ? '#F5F0E8' : '#070707'
  const cardBg  = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)'
  const cardBdr = isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.11)'
  const skelHi  = isLight ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.18)'
  const skelLo  = isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)'
  const titleClr= isLight ? '#0a0a0a' : '#ffffff'
  const subClr  = isLight ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.32)'

  return (
    <div ref={containerRef} style={{ height: '350vh', position: 'relative', background: bg }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: isLight
            ? 'radial-gradient(ellipse 70% 50% at 50% 70%, rgba(160,120,80,0.06) 0%, transparent 70%)'
            : 'radial-gradient(ellipse 70% 50% at 50% 70%, rgba(160,120,80,0.07) 0%, transparent 70%)',
        }} />

        {/* Section text */}
        <div style={{ position: 'absolute', top: '10%', left: 0, right: 0, textAlign: 'center', zIndex: 20, pointerEvents: 'none' }}>
          <motion.p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(160,120,80,0.65)', marginBottom: 12, opacity: titleOpac, y: titleY }}>
            The experience
          </motion.p>
          <motion.h2 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 800, letterSpacing: '-0.035em', color: titleClr, margin: 0, opacity: titleOpac, y: titleY }}>
            From thought to interface
          </motion.h2>
          <motion.p style={{ marginTop: 14, fontSize: '1.05rem', color: subClr, opacity: subOpac, y: subY }}>
            Describe anything. Watch it materialize.
          </motion.p>
        </div>

        {/* 3D Scene */}
        <motion.div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 900, opacity: sceneOpac }}>
          <motion.div style={{
            width: 700, height: 460,
            position: 'relative',
            transformStyle: 'preserve-3d',
            rotateX, rotateY, z: camZ, scale: sceneScale,
          }}>
            <svg width="700" height="460" viewBox="0 0 700 460" style={{ position: 'absolute', inset: 0 }}>
              <defs>
                <radialGradient id="gridGlow2" cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stopColor="#A07850" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#A07850" stopOpacity="0" />
                </radialGradient>
              </defs>
              {Array.from({ length: 11 }).map((_, i) => {
                const x = (i / 10) * 700
                return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={460} stroke={isLight ? 'rgba(0,0,0,0.08)' : 'rgba(160,120,80,0.12)'} strokeWidth={0.6} />
              })}
              {Array.from({ length: 8 }).map((_, i) => {
                const y = (i / 7) * 460
                return <line key={`h${i}`} x1={0} y1={y} x2={700} y2={y} stroke={isLight ? 'rgba(0,0,0,0.08)' : 'rgba(160,120,80,0.12)'} strokeWidth={0.6} />
              })}
              {[0, 0.16, 0.33, 0.5, 0.66, 0.84, 1].map((t, i) => (
                <line key={`r${i}`} x1={t * 700} y1={0} x2={350} y2={230} stroke={isLight ? 'rgba(0,0,0,0.10)' : 'rgba(160,120,80,0.18)'} strokeWidth={0.5} />
              ))}
              <ellipse cx="350" cy="230" rx="220" ry="140" fill="url(#gridGlow2)" />
              <motion.line x1="0" y1="230" x2="700" y2="230" stroke="#A07850" strokeWidth={1} strokeDasharray="20 8" style={{ opacity: glowOpac }}
                animate={{ strokeDashoffset: [0, -280] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />
              <motion.line x1="350" y1="0" x2="350" y2="460" stroke="#A07850" strokeWidth={1} strokeDasharray="20 8" style={{ opacity: glowOpac }}
                animate={{ strokeDashoffset: [0, -280] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 1.5 }} />
            </svg>

            {/* Main glass card */}
            <motion.div
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 280, height: 200, borderRadius: 20, background: cardBg, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: cardBdr, boxShadow: isLight ? '0 12px 48px rgba(0,0,0,0.12)' : '0 24px 80px rgba(0,0,0,0.6)', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 10, translateZ: 60 }}
              animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(160,120,80,0.25)' }} />
                <div style={{ width: 80, height: 7, borderRadius: 4, background: skelHi }} />
              </div>
              <div style={{ width: '100%', height: 7, borderRadius: 4, background: skelLo }} />
              <div style={{ width: '80%', height: 7, borderRadius: 4, background: skelLo }} />
              <div style={{ width: '90%', height: 7, borderRadius: 4, background: skelLo }} />
              <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, height: 32, borderRadius: 8, background: 'rgba(160,120,80,0.40)' }} />
                <div style={{ width: 72, height: 32, borderRadius: 8, background: skelLo }} />
              </div>
            </motion.div>

            {/* Side cards */}
            <motion.div style={{ position: 'absolute', top: '30%', left: '4%', width: 130, height: 90, borderRadius: 14, background: cardBg, border: cardBdr, padding: '14px', display: 'flex', flexDirection: 'column', gap: 7, translateZ: 30 }}
              animate={{ y: [0, 5, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}>
              <div style={{ width: '70%', height: 6, borderRadius: 3, background: skelHi }} />
              <div style={{ width: '100%', height: 6, borderRadius: 3, background: skelLo }} />
              <div style={{ width: '60%', height: 6, borderRadius: 3, background: skelLo }} />
            </motion.div>

            <motion.div style={{ position: 'absolute', top: '20%', right: '4%', width: 120, height: 80, borderRadius: 14, background: cardBg, border: cardBdr, padding: '12px', display: 'flex', flexDirection: 'column', gap: 6, translateZ: 20 }}
              animate={{ y: [0, -8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.4 }}>
              <div style={{ width: '80%', height: 6, borderRadius: 3, background: 'rgba(160,120,80,0.35)' }} />
              <div style={{ width: '60%', height: 6, borderRadius: 3, background: skelLo }} />
              <div style={{ width: '90%', height: 6, borderRadius: 3, background: skelLo }} />
            </motion.div>

            <motion.div style={{ position: 'absolute', bottom: '8%', left: '50%', transform: 'translateX(-50%)', width: 200, height: 52, borderRadius: 12, background: cardBg, border: cardBdr, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, translateZ: 10 }}
              animate={{ y: [0, 4, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(160,120,80,0.25)', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ height: 5, borderRadius: 3, background: skelHi }} />
                <div style={{ height: 5, width: '60%', borderRadius: 3, background: skelLo }} />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURES BENTO
// ─────────────────────────────────────────────────────────────────────────────
function GlassCard({ children, delay = 0, isLight, style = {} }: { children: React.ReactNode, delay?: number, isLight: boolean, style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.15 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      style={{
        borderRadius: 22,
        background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: isLight ? '1px solid rgba(0,0,0,0.07)' : '1px solid rgba(255,255,255,0.09)',
        boxShadow: isLight
          ? '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.70)'
          : '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)',
        overflow: 'hidden', position: 'relative',
        ...style,
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
        background: isLight
          ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.90), transparent)'
          : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
        pointerEvents: 'none',
      }} />
      {children}
    </motion.div>
  )
}

function Features({ isLight }: { isLight: boolean }) {
  const text    = isLight ? '#0a0a0a' : '#ffffff'
  const subText = isLight ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.38)'
  const eyebrow = isLight ? 'rgba(160,120,80,0.70)' : 'rgba(160,120,80,0.60)'
  const iconBg  = 'rgba(160,120,80,0.16)'

  const features = [
    {
      title: 'Describe once, ship forever',
      body: 'Type what you want to build in plain language. Palm interprets intent, not keywords — and generates interfaces that look like a designer spent weeks on them.',
      col: '1 / 8', row: '1', large: true,
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M3 11h16M11 3v16" stroke="#A07850" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="11" cy="11" r="2" fill="#A07850"/>
        </svg>
      ),
    },
    {
      title: 'Liquid glass. Always.',
      body: 'Every output inherits Palm\'s glass design system — your brand, our polish. Dark, light, in-between.',
      col: '8 / 13', row: '1', large: false,
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="8" stroke="#A07850" strokeWidth="1.5"/>
          <path d="M11 3c4.4 0 8 3.6 8 8" stroke="#A07850" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      title: 'Export-ready code',
      body: 'Clean React, HTML, or Figma. Copy, paste, ship.',
      col: '1 / 5', row: '2', large: false,
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 9h12M10 5l4 4-4 4" stroke="#A07850" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      title: 'Any platform',
      body: 'Web, mobile, tablet — Palm knows the canvas and designs accordingly.',
      col: '5 / 9', row: '2', large: false,
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="3" width="15" height="10" rx="2" stroke="#A07850" strokeWidth="1.5"/>
          <path d="M6 15h6" stroke="#A07850" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      title: 'Real-time refinement',
      body: 'Iterate with follow-up prompts. Palm remembers context and improves every iteration.',
      col: '9 / 13', row: '2', large: false,
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2 9a7 7 0 0 1 13.5-2.5" stroke="#A07850" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M16 9a7 7 0 0 1-13.5 2.5" stroke="#A07850" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M14 4l1.5 2.5L13 7" stroke="#A07850" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ]

  return (
    <section style={{ background: isLight ? '#F5F0E8' : '#070707', padding: '120px 48px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <span style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: eyebrow }}>
            Why Palm
          </span>
          <h2 style={{ marginTop: 14, fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 800, letterSpacing: '-0.035em', color: text }}>
            Every detail. No friction.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridTemplateRows: 'auto auto', gap: 14 }}>
          {features.map((f, i) => (
            <GlassCard key={f.title} isLight={isLight} delay={i * 0.08} style={{ gridColumn: f.col, gridRow: f.row, padding: f.large ? '44px 40px' : '36px 32px', minHeight: f.large ? 300 : 210 }}>
              <div style={{ width: f.large ? 48 : 40, height: f.large ? 48 : 40, borderRadius: f.large ? 14 : 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: f.large ? 24 : 20 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: f.large ? '1.6rem' : '1.2rem', fontWeight: 700, letterSpacing: '-0.025em', color: text, margin: '0 0 12px' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: f.large ? '0.97rem' : '0.9rem', lineHeight: 1.65, color: subText, margin: 0 }}>
                {f.body}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CTA BANNER
// ─────────────────────────────────────────────────────────────────────────────
function CTABanner({ isLight }: { isLight: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={ref} style={{ background: isLight ? '#F5F0E8' : '#070707', padding: '60px 48px 120px' }}>
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={visible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{
          maxWidth: 820, margin: '0 auto',
          borderRadius: 28,
          background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
          border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(24px)',
          boxShadow: isLight
            ? '0 8px 40px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.75)'
            : '0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
          padding: '72px 64px',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: isLight ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.90), transparent)' : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(160,120,80,0.10) 0%, transparent 70%)' }} />
        <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(160,120,80,0.65)', marginBottom: 18 }}>
          Limited early access
        </p>
        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 800, letterSpacing: '-0.035em', color: isLight ? '#0a0a0a' : '#fff', margin: '0 0 16px' }}>
          Build something beautiful today.
        </h2>
        <p style={{ fontSize: '1.05rem', color: isLight ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.35)', margin: '0 0 40px', lineHeight: 1.6 }}>
          No design skills needed. No waiting. No compromise.
        </p>
        <Link href="/auth/sign-up" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '15px 36px', borderRadius: 9999,
          background: isLight ? '#0a0a0a' : '#fff',
          color: isLight ? '#F5F0E8' : '#070707',
          fontSize: 15, fontWeight: 700, letterSpacing: '-0.015em',
          textDecoration: 'none',
          boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.15)' : '0 4px 24px rgba(255,255,255,0.15)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          Start for free
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10M8 3l4 4-4 4" stroke={isLight ? '#F5F0E8' : '#070707'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </motion.div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────────────────
function Footer({ isLight }: { isLight: boolean }) {
  const bg      = isLight ? '#F5F0E8' : '#070707'
  const text    = isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.38)'
  const textHov = isLight ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.70)'
  const label   = isLight ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.22)'
  const border  = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'
  const mark    = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'

  return (
    <footer style={{ background: bg, borderTop: `1px solid ${border}`, padding: '80px 48px 48px', position: 'relative', overflow: 'hidden' }}>
      {/* Massive PALM watermark */}
      <div style={{
        fontSize: 'clamp(6rem, 20vw, 18rem)',
        fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 0.88,
        color: mark,
        userSelect: 'none', pointerEvents: 'none',
        position: 'absolute', bottom: -20, left: 40, zIndex: 0,
      }}>
        PALM
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 48 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: isLight ? '#F5F0E8' : '#070707' }} />
            </div>
            <span style={{ color: isLight ? 'rgba(0,0,0,0.60)' : 'rgba(255,255,255,0.60)', fontSize: 14, fontWeight: 600 }}>Palm</span>
          </div>
          <p style={{ fontSize: 12, color: label, maxWidth: 200, lineHeight: 1.65 }}>
            Turn ideas into interfaces,<br />instantly.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 64, flexWrap: 'wrap' }}>
          {[
            { label: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
            { label: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
            { label: 'Legal',   links: ['Privacy', 'Terms', 'Security'] },
          ].map(col => (
            <div key={col.label}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: label, marginBottom: 16 }}>{col.label}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(l => (
                  <a key={l} href="#" style={{ fontSize: 13, color: text, textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = textHov)}
                    onMouseLeave={e => (e.currentTarget.style.color = text)}
                  >{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, marginTop: 72, paddingTop: 24, borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <p style={{ fontSize: 11, color: label }}>© {new Date().getFullYear()} Palm. All rights reserved.</p>
        <p style={{ fontSize: 11, color: label }}>Made with obsession, not templates.</p>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <Loading /> 

  const effectiveTheme = theme === 'system' ? systemTheme : theme
  const isLight = effectiveTheme === 'light'

  return (
    <>
      <CustomCursor />
      <Nav isLight={isLight} />
      <main style={{ cursor: 'none' }}>
        <Hero isLight={isLight} />
        <CameraSection isLight={isLight} />
        <Features isLight={isLight} />
        <CTABanner isLight={isLight} />
        <Footer isLight={isLight} />
      </main>
      
      {/* Theme toggle — bottom right */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50 }}>
        <GlassTooltip content="Toggle theme" side="left">
          <ThemeToggle />
        </GlassTooltip>
      </div>
    </>
  )
}