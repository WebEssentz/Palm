'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  motion, useScroll, useTransform, useSpring,
  AnimatePresence, useMotionValue, useMotionTemplate,
} from 'framer-motion'
import { useTheme } from 'next-themes'
import ParticleBackground from '@/components/home/particle-background'
import { ThemeToggle } from '@/components/theme/toggle'
import { GlassTooltip } from '@/components/ui/glass-tooltip'
import Loading from '@/app/(protected)/dashboard/loading'

// ─── Spring configs ────────────────────────────────────────────────────────
const SPRING_SNAPPY  = { type: 'spring', stiffness: 400, damping: 18 } as const
const SPRING_SOFT    = { type: 'spring', stiffness: 180, damping: 22 } as const
const EASE_OUT_EXPO  = [0.16, 1, 0.3, 1] as const

// ─────────────────────────────────────────────────────────────────────────────
// GLASS SCROLLBAR — injected globally so every section benefits
// ─────────────────────────────────────────────────────────────────────────────
const SCROLLBAR_CSS = `
  * { scrollbar-width: thin; scrollbar-color: rgba(160,120,80,0.28) transparent; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: rgba(160,120,80,0.28);
    border-radius: 9999px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(160,120,80,0.52);
  }
`

// ─────────────────────────────────────────────────────────────────────────────
// PHYSICS BUTTON
// ─────────────────────────────────────────────────────────────────────────────
function PhysicsLink({
  href, children, dark, style = {},
}: {
  href: string
  children: React.ReactNode
  dark?: boolean
  style?: React.CSSProperties
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.97, y: 0 }}
      transition={SPRING_SNAPPY}
      style={{ display: 'inline-flex' }}
    >
      <Link
        href={href}
        style={{
          padding: '15px 38px', borderRadius: 9999,
          background: dark ? '#0a0a0a' : '#ffffff',
          color: dark ? '#F5F0E8' : '#070707',
          fontSize: 15, fontWeight: 700, letterSpacing: '-0.015em',
          textDecoration: 'none',
          boxShadow: dark
            ? '0 4px 20px rgba(0,0,0,0.18)'
            : '0 0 0 1px rgba(255,255,255,0.1), 0 8px 40px rgba(0,0,0,0.4)',
          display: 'inline-flex', alignItems: 'center', gap: 10,
          ...style,
        }}
      >
        {children}
      </Link>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM CURSOR — liquid glass circle
// Uses useMotionTemplate for inner specular highlight (glass realism)
// Uses SPRING_SOFT for the characteristic liquid lag
// ─────────────────────────────────────────────────────────────────────────────
function CustomCursor() {
  const mouseX   = useMotionValue(-200)
  const mouseY   = useMotionValue(-200)
  const [isHovered, setIsHovered] = useState(false)

  // SPRING_SOFT gives the glass-circle its liquid trailing feel
  const x = useSpring(mouseX, SPRING_SOFT)
  const y = useSpring(mouseY, SPRING_SOFT)

  // useMotionTemplate: a static specular highlight that sells the glass illusion
  const glassHighlight = useMotionTemplate`radial-gradient(
    circle at 30% 28%,
    rgba(255,255,255,0.55) 0%,
    rgba(255,255,255,0.06) 50%,
    transparent 72%
  )`

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }
    const onOver = (e: MouseEvent) => {
      if ((e.target as Element).closest('a,button,[data-cursor]')) setIsHovered(true)
    }
    const onOut = () => setIsHovered(false)

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout',  onOut)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout',  onOut)
    }
  }, [mouseX, mouseY])

  return (
    <motion.div
      style={{
        position: 'fixed', top: 0, left: 0, zIndex: 99999,
        pointerEvents: 'none',
        x, y,
        translateX: '-50%',
        translateY: '-50%',
      }}
    >
      {/* Outer glass disc */}
      <motion.div
        animate={{
          width:  isHovered ? 54 : 32,
          height: isHovered ? 54 : 32,
          opacity: isHovered ? 0.92 : 0.80,
        }}
        transition={SPRING_SOFT}
        style={{
          borderRadius: '50%',
          background: 'rgba(160,120,80,0.07)',
          backdropFilter: 'blur(14px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(14px) saturate(1.6)',
          border: '1px solid rgba(160,120,80,0.40)',
          boxShadow: [
            'inset 0 1.5px 0 rgba(255,255,255,0.45)',
            'inset 0 -1px 0 rgba(0,0,0,0.08)',
            '0 4px 20px rgba(160,120,80,0.14)',
          ].join(', '),
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Specular glass highlight via useMotionTemplate */}
        <motion.div
          style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            background: glassHighlight,
          }}
        />
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// NAV — pill morph with BIDIRECTIONAL transitions
// Going down → fast EASE_OUT_EXPO (beautiful snap into pill)
// Going back → SPRING_SOFT (relaxed, natural return to full bar)
// useMotionTemplate drives backdrop blur as a continuous motion value
// ─────────────────────────────────────────────────────────────────────────────
function Nav({ isLight }: { isLight: boolean }) {
  const [scrolled, setScrolled] = useState(false)

  // Motion value: 0 = top, 1 = scrolled. Spring smooths it continuously.
  const scrollProg = useMotionValue(0)
  const sp = useSpring(scrollProg, SPRING_SOFT)

  // useMotionTemplate: backdrop blur animates fluidly between states
  const blurAmt       = useTransform(sp, [0, 1], [0, 28])
  const backdropBlur  = useMotionTemplate`blur(${blurAmt}px)`

  useEffect(() => {
    const fn = () => {
      const s = window.scrollY > 60
      setScrolled(s)
      scrollProg.set(s ? 1 : 0)
    }
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [scrollProg])

  return (
    <>
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <defs>
          {['dark', 'light'].map(m => (
            <filter
              key={m} id={`nav-glass-${m}`}
              x="-10%" y="-40%" width="120%" height="180%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence type="fractalNoise" baseFrequency="0.65 0.42" numOctaves="3" seed="7" result="noise">
                <animate attributeName="baseFrequency" values="0.65 0.42;0.67 0.44;0.65 0.42" dur="10s" repeatCount="indefinite"/>
              </feTurbulence>
              <feGaussianBlur in="noise" stdDeviation="1.2" result="blurNoise"/>
              <feDisplacementMap in="SourceGraphic" in2="blurNoise" scale="8" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
              <feComposite in="displaced" in2="SourceGraphic" operator="atop"/>
            </filter>
          ))}
        </defs>
      </svg>

      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        display: 'flex', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <motion.nav
          initial={{ y: -32, opacity: 0 }}
          animate={{
            y:             scrolled ? 14   : 0,
            opacity:       1,
            maxWidth:      scrolled ? 580  : 2000,
            paddingTop:    scrolled ? 10   : 18,
            paddingBottom: scrolled ? 10   : 18,
            paddingLeft:   scrolled ? 20   : 48,
            paddingRight:  scrolled ? 20   : 48,
            borderRadius:  scrolled ? 9999 : 0,
          }}
          // ─── BIDIRECTIONAL TRANSITION ──────────────────────────────────
          // Scrolling down → snappy expo (satisfying pill morph)
          // Scrolling back → SPRING_SOFT (gentle, organic relaxation)
          transition={scrolled
            ? { duration: 0.52, ease: EASE_OUT_EXPO }
            : SPRING_SOFT
          }
          style={{
            pointerEvents: 'auto', width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40,
            background: scrolled
              ? (isLight ? 'rgba(245,240,232,0.78)' : 'rgba(8,8,8,0.80)')
              : 'transparent',
            // ─── useMotionTemplate powers this ────────────────────────────
            backdropFilter: backdropBlur as unknown as string,
            WebkitBackdropFilter: backdropBlur as unknown as string,
            // ──────────────────────────────────────────────────────────────
            border: scrolled
              ? (isLight ? '1px solid rgba(0,0,0,0.09)' : '1px solid rgba(255,255,255,0.10)')
              : '1px solid transparent',
            boxShadow: scrolled
              ? (isLight
                  ? '0 2px 28px rgba(0,0,0,0.09),inset 0 1px 0 rgba(255,255,255,0.62)'
                  : '0 2px 28px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.08)')
              : 'none',
            filter: scrolled ? `url(#nav-glass-${isLight ? 'light' : 'dark'})` : 'none',
            overflow: 'hidden', position: 'relative',
          }}
        >
          <AnimatePresence>
            {scrolled && (
              <motion.span
                key="streak"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                aria-hidden="true"
                style={{
                  position: 'absolute', top: 0, left: '8%', right: '8%', height: 1,
                  background: isLight
                    ? 'linear-gradient(90deg,transparent,rgba(255,255,255,0.80),transparent)'
                    : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.20),transparent)',
                  borderRadius: 9999, pointerEvents: 'none',
                }}
              />
            )}
          </AnimatePresence>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.88)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: isLight ? '#F5F0E8' : '#070707',
              }}/>
            </div>
            <span style={{
              color: isLight ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.70)',
              fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
            }}>Palm</span>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {['Features', 'Pricing', 'Docs'].map(l => (
              <motion.a
                key={l} href="#"
                whileHover={{ y: -1 }}
                transition={SPRING_SNAPPY}
                style={{
                  color: isLight ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.38)',
                  fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em',
                  transition: 'color 0.15s', textDecoration: 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = isLight ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.80)')}
                onMouseLeave={e => (e.currentTarget.style.color = isLight ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.38)')}
              >{l}</motion.a>
            ))}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} transition={SPRING_SNAPPY}>
              <Link
                href="/auth/sign-up"
                style={{
                  padding: '8px 18px', borderRadius: 9999,
                  background: isLight ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.92)',
                  color: isLight ? '#F5F0E8' : '#070707',
                  fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em',
                  textDecoration: 'none', display: 'block',
                }}
              >
                Get started
              </Link>
            </motion.div>
          </div>
        </motion.nav>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO — 4 independent z-planes of parallax
// ─────────────────────────────────────────────────────────────────────────────
const HERO_WORDS = ['instantly.', 'effortlessly.', 'beautifully.', 'magically.']

function Hero({ isLight }: { isLight: boolean }) {
  const [wordIdx, setWordIdx] = useState(0)
  const heroRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const sp = useSpring(scrollYProgress, { stiffness: 60, damping: 18 })

  const particleY   = useTransform(sp, [0, 1], [0, -60])
  const glowY       = useTransform(sp, [0, 1], [0, 80])
  const titleY      = useTransform(sp, [0, 1], [0, -220])
  const titleScale  = useTransform(sp, [0, 1], [1, 0.88])
  const subtitleY   = useTransform(sp, [0, 1], [0, -140])
  const ctaY        = useTransform(sp, [0, 1], [0, -80])
  const heroOpacity = useTransform(sp, [0, 0.6], [1, 0])

  useEffect(() => {
    const id = setInterval(() => setWordIdx(i => (i + 1) % HERO_WORDS.length), 3200)
    return () => clearInterval(id)
  }, [])

  const bg   = isLight ? '#F5F0E8' : '#070707'
  const text = isLight ? '#0a0a0a' : '#ffffff'
  const sub  = isLight ? 'rgba(0,0,0,0.44)' : 'rgba(255,255,255,0.36)'

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } } }
  const itemUp  = {
    hidden: { opacity: 0, y: 48, filter: 'blur(4px)' },
    show:   { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.9, ease: EASE_OUT_EXPO } },
  }
  const itemFade = {
    hidden: { opacity: 0, y: 24 },
    show:   { opacity: 1, y: 0,  transition: { duration: 0.8, ease: EASE_OUT_EXPO } },
  }

  return (
    <section ref={heroRef} style={{
      position: 'relative', minHeight: '100dvh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', background: bg,
    }}>
      {/* Plane 0 — particles */}
      <motion.div style={{ position: 'absolute', inset: 0, y: particleY }}>
        <ParticleBackground />
      </motion.div>

      {/* Glow */}
      <motion.div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', y: glowY,
        background: isLight
          ? 'radial-gradient(ellipse 55% 45% at 50% 65%, rgba(160,120,80,0.10) 0%, transparent 70%)'
          : 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(160,120,80,0.14) 0%, transparent 70%)',
      }}/>

      <motion.div style={{ opacity: heroOpacity, position: 'relative', zIndex: 10, width: '100%' }}>
        <motion.div
          variants={stagger} initial="hidden" animate="show"
          style={{ textAlign: 'center', padding: '0 24px', maxWidth: 940, margin: '0 auto' }}
        >
          {/* Plane 1 — title */}
          <motion.div variants={itemUp} style={{ y: titleY, scale: titleScale, transformOrigin: '50% 60%' }}>
            <h1 style={{
              fontSize: 'clamp(3.2rem, 8vw, 7rem)', fontWeight: 800,
              lineHeight: 1.02, letterSpacing: '-0.045em', color: text, margin: 0,
            }}>
              Turn ideas into interfaces,
              <br/>
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIdx}
                  initial={{ opacity: 0, y: 28, filter: 'blur(12px)' }}
                  animate={{ opacity: 1, y: 0,  filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -18, filter: 'blur(8px)', transition: { duration: 0.28, ease: 'easeIn' } }}
                  transition={{ duration: 0.52, ease: EASE_OUT_EXPO }}
                  style={{ color: '#A07850', display: 'inline-block' }}
                >
                  {HERO_WORDS[wordIdx]}
                </motion.span>
              </AnimatePresence>
            </h1>
          </motion.div>

          {/* Plane 2 — subtitle */}
          <motion.div variants={itemFade} style={{ y: subtitleY }}>
            <p style={{
              marginTop: 32,
              fontSize: 'clamp(1rem, 2.2vw, 1.22rem)',
              color: sub, fontWeight: 400, lineHeight: 1.68, letterSpacing: '0.005em',
            }}>
              Describe what you want to build. Palm generates production-ready UI<br/>
              that you can refine, export, and ship — no design tools required.
            </p>
          </motion.div>

          {/* Plane 3 — CTA */}
          <motion.div variants={itemFade} style={{ marginTop: 48, display: 'flex', justifyContent: 'center', y: ctaY }}>
            <PhysicsLink href="/auth/sign-up" dark={isLight}>
              Start building free
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke={isLight ? '#F5F0E8' : '#070707'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </PhysicsLink>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4, duration: 1.2 }}
        style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
      >
        <motion.div
          animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 1, height: 44,
            background: isLight
              ? 'linear-gradient(to bottom,rgba(0,0,0,0),rgba(0,0,0,0.22))'
              : 'linear-gradient(to bottom,rgba(255,255,255,0),rgba(255,255,255,0.24))',
            margin: '0 auto',
          }}
        />
      </motion.div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HOW IT WORKS
// ─────────────────────────────────────────────────────────────────────────────
function HowItWorks({ isLight }: { isLight: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.3'] })
  const sp = useSpring(scrollYProgress, { stiffness: 60, damping: 20 })

  const bg      = isLight ? '#F5F0E8' : '#070707'
  const text    = isLight ? '#0a0a0a' : '#ffffff'
  const sub     = isLight ? 'rgba(0,0,0,0.44)' : 'rgba(255,255,255,0.38)'
  const lineClr = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'

  const steps = [
    {
      n: '01', title: 'Describe your idea',
      body: 'Type anything — "a dark dashboard for crypto analytics" or "mobile onboarding for a fitness app". Plain language, no syntax.',
    },
    {
      n: '02', title: 'Palm materializes it',
      body: 'Watch the interface appear in real time. Every layout decision, every color, every component — generated with production intent.',
    },
    {
      n: '03', title: 'Refine and ship',
      body: 'Iterate with follow-up prompts. Export clean React, copy the code, or push directly to Figma. Zero friction, start to finish.',
    },
  ]

  return (
    <section ref={ref} style={{ background: bg, padding: '140px 48px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
          style={{ marginBottom: 100 }}
        >
          <span style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(160,120,80,0.65)' }}>
            How it works
          </span>
          <h2 style={{
            marginTop: 14,
            fontSize: 'clamp(2rem, 4vw, 3.4rem)',
            fontWeight: 800, letterSpacing: '-0.038em', color: text, maxWidth: 520,
          }}>
            Three steps from idea to interface.
          </h2>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: i * 0.14 }}
              style={{
                display: 'grid', gridTemplateColumns: '80px 1fr',
                gap: '0 48px', paddingTop: 48, paddingBottom: 48,
                borderTop: `1px solid ${lineClr}`, position: 'relative',
              }}
            >
              <div style={{ paddingTop: 4 }}>
                <span style={{
                  fontSize: 'clamp(2.4rem, 4vw, 3.2rem)', fontWeight: 800,
                  letterSpacing: '-0.05em', color: 'rgba(160,120,80,0.25)', lineHeight: 1,
                }}>{s.n}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 80px', alignItems: 'start' }}>
                <h3 style={{
                  fontSize: 'clamp(1.3rem, 2.2vw, 1.8rem)',
                  fontWeight: 700, letterSpacing: '-0.03em', color: text, margin: 0,
                }}>{s.title}</h3>
                <p style={{ fontSize: '1rem', lineHeight: 1.72, color: sub, margin: 0 }}>{s.body}</p>
              </div>

              <motion.div style={{
                position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                width: 6, height: 6, borderRadius: '50%', background: '#A07850',
                opacity: useTransform(sp, [i / 3, (i + 0.5) / 3], [0, 1]),
                scale:   useTransform(sp, [i / 3, (i + 0.5) / 3], [0.5, 1]),
              }}/>
            </motion.div>
          ))}
          <div style={{ borderTop: `1px solid ${lineClr}` }}/>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D CAMERA SECTION
// ─────────────────────────────────────────────────────────────────────────────
function CameraSection({ isLight }: { isLight: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] })
  const sp = useSpring(scrollYProgress, { stiffness: 55, damping: 22 })

  const rotateX    = useTransform(sp, [0, 0.55], [56, 0])
  const rotateY    = useTransform(sp, [0, 0.55], [-22, 0])
  const camZ       = useTransform(sp, [0, 0.65], [-1100, 0])
  const sceneScale = useTransform(sp, [0, 0.65], [0.44, 1])
  const sceneOpac  = useTransform(sp, [0, 0.07, 0.88, 1], [0, 1, 1, 0])
  const titleOpac  = useTransform(sp, [0.10, 0.34, 0.76, 0.88], [0, 1, 1, 0])
  const titleY     = useTransform(sp, [0.10, 0.34], [36, 0])
  const subOpac    = useTransform(sp, [0.26, 0.44, 0.78, 0.90], [0, 1, 1, 0])
  const subY       = useTransform(sp, [0.26, 0.44], [24, 0])
  const glowOpac   = useTransform(sp, [0.28, 0.58], [0, 1])

  const bg      = isLight ? '#F5F0E8' : '#070707'
  const cardBg  = isLight ? 'rgba(0,0,0,0.04)'            : 'rgba(255,255,255,0.05)'
  const cardBdr = isLight ? '1px solid rgba(0,0,0,0.08)'  : '1px solid rgba(255,255,255,0.11)'
  const skelHi  = isLight ? 'rgba(0,0,0,0.14)'            : 'rgba(255,255,255,0.18)'
  const skelLo  = isLight ? 'rgba(0,0,0,0.07)'            : 'rgba(255,255,255,0.08)'
  const titleClr= isLight ? '#0a0a0a' : '#ffffff'
  const subClr  = isLight ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.32)'

  return (
    <div ref={containerRef} style={{ height: '350vh', position: 'relative', background: bg }}>
      <div style={{
        position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: isLight
            ? 'radial-gradient(ellipse 70% 50% at 50% 70%, rgba(160,120,80,0.07) 0%, transparent 70%)'
            : 'radial-gradient(ellipse 70% 50% at 50% 70%, rgba(160,120,80,0.09) 0%, transparent 70%)',
        }}/>

        <div style={{ position: 'absolute', top: '10%', left: 0, right: 0, textAlign: 'center', zIndex: 20, pointerEvents: 'none' }}>
          <motion.p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(160,120,80,0.65)', marginBottom: 12, opacity: titleOpac, y: titleY }}>
            The experience
          </motion.p>
          <motion.h2 style={{
            fontSize: 'clamp(2rem,4.5vw,3.8rem)', fontWeight: 800,
            letterSpacing: '-0.038em', color: titleClr, margin: 0,
            opacity: titleOpac, y: titleY,
          }}>
            From thought to interface
          </motion.h2>
          <motion.p style={{ marginTop: 14, fontSize: '1.05rem', color: subClr, opacity: subOpac, y: subY }}>
            Describe anything. Watch it materialize.
          </motion.p>
        </div>

        <motion.div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          perspective: 900, opacity: sceneOpac,
        }}>
          <motion.div style={{
            width: 700, height: 460, position: 'relative',
            transformStyle: 'preserve-3d',
            rotateX, rotateY, z: camZ, scale: sceneScale,
          }}>
            <svg width="700" height="460" viewBox="0 0 700 460" style={{ position: 'absolute', inset: 0 }}>
              <defs>
                <radialGradient id="gridGlow2" cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stopColor="#A07850" stopOpacity="0.22"/>
                  <stop offset="100%" stopColor="#A07850" stopOpacity="0"/>
                </radialGradient>
              </defs>
              {Array.from({ length: 11 }).map((_, i) => {
                const x = (i / 10) * 700
                return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={460} stroke={isLight ? 'rgba(0,0,0,0.08)' : 'rgba(160,120,80,0.12)'} strokeWidth={0.6}/>
              })}
              {Array.from({ length: 8 }).map((_, i) => {
                const y = (i / 7) * 460
                return <line key={`h${i}`} x1={0} y1={y} x2={700} y2={y} stroke={isLight ? 'rgba(0,0,0,0.08)' : 'rgba(160,120,80,0.12)'} strokeWidth={0.6}/>
              })}
              {[0, 0.16, 0.33, 0.5, 0.66, 0.84, 1].map((t, i) => (
                <line key={`r${i}`} x1={t * 700} y1={0} x2={350} y2={230} stroke={isLight ? 'rgba(0,0,0,0.08)' : 'rgba(160,120,80,0.16)'} strokeWidth={0.5}/>
              ))}
              <ellipse cx="350" cy="230" rx="220" ry="140" fill="url(#gridGlow2)"/>
              <motion.line x1="0" y1="230" x2="700" y2="230" stroke="#A07850" strokeWidth={1} strokeDasharray="20 8" style={{ opacity: glowOpac }} animate={{ strokeDashoffset: [0, -280] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}/>
              <motion.line x1="350" y1="0" x2="350" y2="460" stroke="#A07850" strokeWidth={1} strokeDasharray="20 8" style={{ opacity: glowOpac }} animate={{ strokeDashoffset: [0, -280] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 1.5 }}/>
            </svg>

            {/* Centre card */}
            <motion.div
              style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                width: 280, height: 200, borderRadius: 20,
                background: cardBg, backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)', border: cardBdr,
                boxShadow: isLight ? '0 12px 48px rgba(0,0,0,0.12)' : '0 24px 80px rgba(0,0,0,0.6)',
                padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 10,
                translateZ: 60,
              }}
              animate={{ y: [0, -7, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(160,120,80,0.25)' }}/>
                <div style={{ width: 80, height: 7, borderRadius: 4, background: skelHi }}/>
              </div>
              {[null, null, null].map((_, i) => (
                <div key={i} style={{ width: i === 1 ? '80%' : i === 2 ? '90%' : '100%', height: 7, borderRadius: 4, background: skelLo }}/>
              ))}
              <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, height: 32, borderRadius: 8, background: 'rgba(160,120,80,0.42)' }}/>
                <div style={{ width: 72, height: 32, borderRadius: 8, background: skelLo }}/>
              </div>
            </motion.div>

            {/* Left card */}
            <motion.div
              style={{
                position: 'absolute', top: '30%', left: '4%',
                width: 130, height: 90, borderRadius: 14,
                background: cardBg, border: cardBdr,
                padding: '14px', display: 'flex', flexDirection: 'column', gap: 7,
                translateZ: 30,
              }}
              animate={{ y: [0, 6, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            >
              <div style={{ width: '70%', height: 6, borderRadius: 3, background: skelHi }}/>
              <div style={{ width: '100%', height: 6, borderRadius: 3, background: skelLo }}/>
              <div style={{ width: '60%', height: 6, borderRadius: 3, background: skelLo }}/>
            </motion.div>

            {/* Right card */}
            <motion.div
              style={{
                position: 'absolute', top: '20%', right: '4%',
                width: 120, height: 80, borderRadius: 14,
                background: cardBg, border: cardBdr,
                padding: '12px', display: 'flex', flexDirection: 'column', gap: 6,
                translateZ: 20,
              }}
              animate={{ y: [0, -9, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.4 }}
            >
              <div style={{ width: '80%', height: 6, borderRadius: 3, background: 'rgba(160,120,80,0.35)' }}/>
              <div style={{ width: '60%', height: 6, borderRadius: 3, background: skelLo }}/>
              <div style={{ width: '90%', height: 6, borderRadius: 3, background: skelLo }}/>
            </motion.div>

            {/* Bottom card */}
            <motion.div
              style={{
                position: 'absolute', bottom: '8%', left: '50%',
                transform: 'translateX(-50%)',
                width: 200, height: 52, borderRadius: 12,
                background: cardBg, border: cardBdr,
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                translateZ: 10,
              }}
              animate={{ y: [0, 5, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(160,120,80,0.25)', flexShrink: 0 }}/>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ height: 5, borderRadius: 3, background: skelHi }}/>
                <div style={{ height: 5, width: '60%', borderRadius: 3, background: skelLo }}/>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURES BENTO — magnetic hover physics
// ─────────────────────────────────────────────────────────────────────────────
function MagneticCard({
  children, delay = 0, isLight, style = {},
}: {
  children: React.ReactNode
  delay?: number
  isLight: boolean
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const rotX = useMotionValue(0)
  const rotY = useMotionValue(0)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.12 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    rotX.set(((e.clientY - (rect.top  + rect.height / 2)) / rect.height) * -8)
    rotY.set(((e.clientX - (rect.left + rect.width  / 2)) / rect.width)  *  8)
  }
  const onMouseLeave = () => { rotX.set(0); rotY.set(0) }

  const srX = useSpring(rotX, { stiffness: 260, damping: 24 })
  const srY = useSpring(rotY, { stiffness: 260, damping: 24 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.72, ease: EASE_OUT_EXPO, delay }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        rotateX: srX, rotateY: srY,
        transformStyle: 'preserve-3d',
        borderRadius: 22,
        background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: isLight ? '1px solid rgba(0,0,0,0.07)' : '1px solid rgba(255,255,255,0.09)',
        boxShadow: isLight
          ? '0 4px 24px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.70)'
          : '0 8px 40px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.07)',
        overflow: 'hidden', position: 'relative',
        ...style,
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
        background: isLight
          ? 'linear-gradient(90deg,transparent,rgba(255,255,255,0.90),transparent)'
          : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)',
        pointerEvents: 'none',
      }}/>
      {children}
    </motion.div>
  )
}

function Features({ isLight }: { isLight: boolean }) {
  const text    = isLight ? '#0a0a0a' : '#ffffff'
  const subText = isLight ? 'rgba(0,0,0,0.44)' : 'rgba(255,255,255,0.38)'

  const features = [
    {
      title: 'Describe once, ship forever',
      body: "Type what you want to build in plain language. Palm interprets intent, not keywords — and generates interfaces that look like a designer spent weeks on them.",
      col: '1 / 8', row: '1', large: true,
      icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 11h16M11 3v16" stroke="#A07850" strokeWidth="2" strokeLinecap="round"/><circle cx="11" cy="11" r="2" fill="#A07850"/></svg>,
    },
    {
      title: 'Liquid glass. Always.',
      body: "Every output inherits Palm's glass design system — your brand, our polish. Dark, light, in-between.",
      col: '8 / 13', row: '1', large: false,
      icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#A07850" strokeWidth="1.5"/><path d="M11 3c4.4 0 8 3.6 8 8" stroke="#A07850" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    },
    {
      title: 'Export-ready code',
      body: 'Clean React, HTML, or Figma. Copy, paste, ship.',
      col: '1 / 5', row: '2', large: false,
      icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9h12M10 5l4 4-4 4" stroke="#A07850" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
      title: 'Any platform',
      body: 'Web, mobile, tablet — Palm knows the canvas and designs accordingly.',
      col: '5 / 9', row: '2', large: false,
      icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1.5" y="3" width="15" height="10" rx="2" stroke="#A07850" strokeWidth="1.5"/><path d="M6 15h6" stroke="#A07850" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    },
    {
      title: 'Real-time refinement',
      body: 'Iterate with follow-up prompts. Palm remembers context and improves every iteration.',
      col: '9 / 13', row: '2', large: false,
      icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 9a7 7 0 0 1 13.5-2.5" stroke="#A07850" strokeWidth="1.5" strokeLinecap="round"/><path d="M16 9a7 7 0 0 1-13.5 2.5" stroke="#A07850" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 4l1.5 2.5L13 7" stroke="#A07850" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
  ]

  return (
    <section style={{ background: isLight ? '#F5F0E8' : '#070707', padding: '130px 48px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
          style={{ textAlign: 'center', marginBottom: 80 }}
        >
          <span style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: isLight ? 'rgba(160,120,80,0.70)' : 'rgba(160,120,80,0.60)' }}>
            Why Palm
          </span>
          <h2 style={{
            marginTop: 14, fontSize: 'clamp(2rem,4vw,3.4rem)',
            fontWeight: 800, letterSpacing: '-0.038em', color: text,
          }}>
            Every detail. No friction.
          </h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gridTemplateRows: 'auto auto', gap: 14 }}>
          {features.map((f, i) => (
            <MagneticCard
              key={f.title} isLight={isLight} delay={i * 0.07}
              style={{ gridColumn: f.col, gridRow: f.row, padding: f.large ? '44px 40px' : '36px 32px', minHeight: f.large ? 300 : 210 }}
            >
              <div style={{
                width: f.large ? 48 : 40, height: f.large ? 48 : 40,
                borderRadius: f.large ? 14 : 12,
                background: 'rgba(160,120,80,0.16)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: f.large ? 24 : 20,
              }}>{f.icon}</div>
              <h3 style={{ fontSize: f.large ? '1.6rem' : '1.22rem', fontWeight: 700, letterSpacing: '-0.028em', color: text, margin: '0 0 12px' }}>{f.title}</h3>
              <p style={{ fontSize: f.large ? '0.97rem' : '0.9rem', lineHeight: 1.7, color: subText, margin: 0 }}>{f.body}</p>
            </MagneticCard>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ — glass accordion with SPRING_SOFT animation
// Positioned before the CTA to resolve objections at the decision moment
// ─────────────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'What exactly is Palm?',
    a: "Palm is an AI UI generator with a design point of view. Describe what you want to build in plain English and watch a polished, production-ready interface appear. No drag-and-drop, no templates, no design tools.",
  },
  {
    q: 'Is it free to start?',
    a: "Yes — early access is completely free with no credit card required. We'll introduce paid plans as we scale. Early users get priority access and preferential pricing, permanently.",
  },
  {
    q: 'What can I export?',
    a: "Clean React (TypeScript), raw HTML/CSS, or Figma-ready components. Everything Palm generates is production-intent — not just pretty, but shippable.",
  },
  {
    q: 'Does it handle mobile and responsive UI?',
    a: "Absolutely. Palm understands the canvas. Whether you're describing a 375px mobile onboarding flow or a 1440px analytics dashboard, the output is responsive and intentional by default.",
  },
  {
    q: 'How is Palm different from v0, Galileo, or other AI design tools?',
    a: "Palm has a point of view. It's not a generic code generator — it's built around a specific aesthetic (liquid glass, precise motion, typographic craft) that makes every output feel considered, not computed.",
  },
]

function FAQ({ isLight }: { isLight: boolean }) {
  const [open, setOpen] = useState<number | null>(null)

  const bg   = isLight ? '#F5F0E8' : '#070707'
  const text = isLight ? '#0a0a0a' : '#ffffff'
  const sub  = isLight ? 'rgba(0,0,0,0.46)' : 'rgba(255,255,255,0.40)'
  const line = isLight ? 'rgba(0,0,0,0.07)'  : 'rgba(255,255,255,0.07)'

  return (
    <section style={{ background: bg, padding: '130px 48px' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
          style={{ marginBottom: 64 }}
        >
          <span style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(160,120,80,0.65)' }}>
            FAQ
          </span>
          <h2 style={{
            marginTop: 14,
            fontSize: 'clamp(2rem, 4vw, 3.2rem)',
            fontWeight: 800, letterSpacing: '-0.038em', color: text, margin: '14px 0 0',
          }}>
            Questions?
          </h2>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {FAQ_ITEMS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: i * 0.07 }}
              style={{ borderTop: `1px solid ${line}`, overflow: 'hidden' }}
            >
              {/* Question row */}
              <motion.button
                onClick={() => setOpen(open === i ? null : i)}
                whileHover={{ x: 2 }}
                transition={SPRING_SOFT}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', padding: '28px 0',
                  background: 'none', border: 'none', cursor: 'none',
                  textAlign: 'left', gap: 24,
                }}
              >
                <span style={{
                  fontSize: 'clamp(0.97rem, 1.6vw, 1.12rem)',
                  fontWeight: 600, letterSpacing: '-0.02em', color: text,
                }}>
                  {item.q}
                </span>

                {/* +/× icon — rotates with SPRING_SOFT */}
                <motion.div
                  animate={{ rotate: open === i ? 45 : 0 }}
                  transition={SPRING_SOFT}
                  style={{
                    flexShrink: 0, width: 22, height: 22,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%',
                    border: `1px solid rgba(160,120,80,0.30)`,
                    background: open === i ? 'rgba(160,120,80,0.12)' : 'transparent',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 1v8M1 5h8" stroke="rgba(160,120,80,0.85)" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </motion.div>
              </motion.button>

              {/* Answer — springs open/close */}
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    key="answer"
                    initial={{ height: 0, opacity: 0, y: -8 }}
                    animate={{ height: 'auto', opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -4 }}
                    transition={SPRING_SOFT}
                    style={{ overflow: 'hidden' }}
                  >
                    <p style={{
                      paddingBottom: 28, paddingRight: 48,
                      fontSize: '0.96rem', lineHeight: 1.78, color: sub, margin: 0,
                    }}>
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
          <div style={{ borderTop: `1px solid ${line}` }}/>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSTRATE (CONTAINED) — optimized for CTABanner background
// ─────────────────────────────────────────────────────────────────────────────
const S_BOID_COUNT = 120
const S_RD_SCALE   = 10
const S_RD_STEPS   = 1
const S_DU=0.2097, S_DV=0.1050, S_FEED=0.0545, S_KILL=0.0620
const S_SEP_R=28, S_ALIGN_R=60, S_COH_R=80
const S_MAX_SPEED=1.4, S_MAX_FORCE=0.06
const S_SEP_W=1.6, S_ALIGN_W=0.35, S_COH_W=0.25, S_CHEM_W=0.9
const S_VORTEX_STR=5000, S_FLEE_R=120, S_FLEE_STR=220
const S_CELL = S_COH_R

class SRDGrid {
    cols:number; rows:number
    u:Float32Array; v:Float32Array; nu:Float32Array; nv:Float32Array
    constructor(cols:number,rows:number) {
        this.cols=cols; this.rows=rows
        const n=cols*rows
        this.u=new Float32Array(n).fill(1); this.v=new Float32Array(n)
        this.nu=new Float32Array(n); this.nv=new Float32Array(n)
        for(let i=0;i<20;i++) {
            const cx=Math.floor(Math.random()*cols),cy=Math.floor(Math.random()*rows)
            for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) {
                const idx=this.w(cx+dx,cy+dy); this.v[idx]=1; this.u[idx]=0
            }
        }
    }
    w(x:number,y:number){return(((y%this.rows)+this.rows)%this.rows)*this.cols+(((x%this.cols)+this.cols)%this.cols)}
    step(){
        const{cols,rows,u,v,nu,nv}=this
        for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){
            const i=y*cols+x,ui=u[i],vi=v[i]
            const lu=u[this.w(x-1,y)]+u[this.w(x+1,y)]+u[this.w(x,y-1)]+u[this.w(x,y+1)]-4*ui
            const lv=v[this.w(x-1,y)]+v[this.w(x+1,y)]+v[this.w(x,y-1)]+v[this.w(x,y+1)]-4*vi
            const uvv=ui*vi*vi
            nu[i]=Math.max(0,Math.min(1,ui+S_DU*lu-uvv+S_FEED*(1-ui)))
            nv[i]=Math.max(0,Math.min(1,vi+S_DV*lv+uvv-(S_FEED+S_KILL)*vi))
        }
        this.u.set(nu); this.v.set(nv)
    }
    inject(wx:number,wy:number){
        const cx=Math.floor(wx/S_RD_SCALE),cy=Math.floor(wy/S_RD_SCALE)
        for(let dy=-3;dy<=3;dy++) for(let dx=-3;dx<=3;dx++){
            const i=this.w(cx+dx,cy+dy)
            this.v[i]=Math.min(1,this.v[i]+0.45); this.u[i]=Math.max(0,this.u[i]-0.25)
        }
    }
    getV(wx:number,wy:number){return this.v[this.w(Math.floor(wx/S_RD_SCALE),Math.floor(wy/S_RD_SCALE))]}
    grad(wx:number,wy:number):[number,number]{
        const cx=Math.floor(wx/S_RD_SCALE),cy=Math.floor(wy/S_RD_SCALE)
        return[(this.v[this.w(cx+1,cy)]-this.v[this.w(cx-1,cy)])*.5,
               (this.v[this.w(cx,cy+1)]-this.v[this.w(cx,cy-1)])*.5]
    }
}

class SSpatialHash {
    private cells=new Map<number,number[]>()
    clear(){this.cells.clear()}
    private key(cx:number,cy:number){return cx*100003+cy}
    insert(i:number,x:number,y:number){
        const k=this.key(Math.floor(x/S_CELL),Math.floor(y/S_CELL))
        let c=this.cells.get(k); if(!c){c=[];this.cells.set(k,c)} c.push(i)
    }
    nearby(x:number,y:number):number[]{
        const cx=Math.floor(x/S_CELL),cy=Math.floor(y/S_CELL),out:number[]=[]
        for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
            const c=this.cells.get(this.key(cx+dx,cy+dy)); if(c) for(const i of c) out.push(i)
        }
        return out
    }
}

function sClamp(vx:number,vy:number,max:number):[number,number]{
    const m=Math.sqrt(vx*vx+vy*vy); return m>max?[vx/m*max,vy/m*max]:[vx,vy]
}
function sSteer(bvx:number,bvy:number,tx:number,ty:number):[number,number]{
    const m=Math.sqrt(tx*tx+ty*ty); if(m===0)return[0,0]
    const dx=tx/m*S_MAX_SPEED-bvx,dy=ty/m*S_MAX_SPEED-bvy
    return sClamp(dx,dy,S_MAX_FORCE)
}

function SubstrateContained({ isLight }: { isLight: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const activeRef = useRef(false)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!

        let W = canvas.offsetWidth || 820
        let H = canvas.offsetHeight || 500
        canvas.width = W; canvas.height = H

        let rd   = new SRDGrid(Math.ceil(W/S_RD_SCALE), Math.ceil(H/S_RD_SCALE))
        const hash = new SSpatialHash()

        interface SBoid { x:number; y:number; vx:number; vy:number }
        let boids: SBoid[] = Array.from({length:S_BOID_COUNT},()=>({
            x:Math.random()*W, y:Math.random()*H,
            vx:(Math.random()-.5)*2, vy:(Math.random()-.5)*2,
        }))

        let mx=-9999, my=-9999, animId:number

        const onMove = (e:MouseEvent) => {
            const rect = canvas.getBoundingClientRect()
            mx = e.clientX - rect.left
            my = e.clientY - rect.top
            if (mx>=0 && mx<=W && my>=0 && my<=H) rd.inject(mx, my)
        }
        window.addEventListener('mousemove', onMove)

        const io = new IntersectionObserver(([e]) => {
            activeRef.current = e.isIntersecting
        }, { threshold: 0.05 })
        io.observe(canvas)

        const ro = new ResizeObserver(() => {
            W = canvas.offsetWidth; H = canvas.offsetHeight
            canvas.width = W; canvas.height = H
            rd = new SRDGrid(Math.ceil(W/S_RD_SCALE), Math.ceil(H/S_RD_SCALE))
            boids = boids.map(b => ({
                ...b,
                x: Math.min(b.x, W),
                y: Math.min(b.y, H),
            }))
        })
        ro.observe(canvas)

        const rgb = isLight ? '80,60,30' : '255,255,255'

        function frame() {
            animId = requestAnimationFrame(frame)
            if (!activeRef.current) return

            for (let s=0; s<S_RD_STEPS; s++) rd.step()

            hash.clear()
            for (let i=0;i<boids.length;i++) hash.insert(i,boids[i].x,boids[i].y)

            for (let i=0;i<boids.length;i++) {
                const b=boids[i]
                let sx=0,sy=0,sn=0,ax=0,ay=0,an=0,cx=0,cy=0,cn=0
                for (const j of hash.nearby(b.x,b.y)) {
                    if(i===j) continue
                    const o=boids[j],dx=b.x-o.x,dy=b.y-o.y,d=Math.sqrt(dx*dx+dy*dy)
                    if(d<S_SEP_R&&d>0){sx+=dx/d;sy+=dy/d;sn++}
                    if(d<S_ALIGN_R){ax+=o.vx;ay+=o.vy;an++}
                    if(d<S_COH_R){cx+=o.x;cy+=o.y;cn++}
                }
                let fx=0,fy=0
                if(sn>0){const[a,b2]=sSteer(b.vx,b.vy,sx/sn,sy/sn);fx+=a*S_SEP_W;fy+=b2*S_SEP_W}
                if(an>0){const[a,b2]=sSteer(b.vx,b.vy,ax/an,ay/an);fx+=a*S_ALIGN_W;fy+=b2*S_ALIGN_W}
                if(cn>0){const[a,b2]=sSteer(b.vx,b.vy,cx/cn-b.x,cy/cn-b.y);fx+=a*S_COH_W;fy+=b2*S_COH_W}
                const cdx=b.x-mx,cdy=b.y-my,cr2=cdx*cdx+cdy*cdy+1
                fx+=(-cdy*S_VORTEX_STR)/cr2; fy+=(cdx*S_VORTEX_STR)/cr2
                const cd=Math.sqrt(cr2)
                if(cd<S_FLEE_R){const f=S_FLEE_STR*(1-cd/S_FLEE_R)/(cd+1);fx+=cdx/cd*f;fy+=cdy/cd*f}
                const[gx,gy]=rd.grad(b.x,b.y)
                fx+=gx*S_CHEM_W; fy+=gy*S_CHEM_W
                b.vx+=fx; b.vy+=fy;[b.vx,b.vy]=sClamp(b.vx,b.vy,S_MAX_SPEED)
                b.x+=b.vx; b.y+=b.vy
                if(b.x<0)b.x+=W; else if(b.x>W)b.x-=W
                if(b.y<0)b.y+=H; else if(b.y>H)b.y-=H
            }

            ctx.clearRect(0,0,W,H)

            ctx.lineWidth=0.5
            for(let i=0;i<boids.length;i++) {
                for(const j of hash.nearby(boids[i].x,boids[i].y)) {
                    if(j<=i) continue
                    const dx=boids[i].x-boids[j].x,dy=boids[i].y-boids[j].y,d2=dx*dx+dy*dy
                    if(d2<2500){
                        ctx.strokeStyle=`rgba(${rgb},${((1-d2/2500)*(isLight?.05:.04)).toFixed(3)})`
                        ctx.beginPath(); ctx.moveTo(boids[i].x,boids[i].y)
                        ctx.lineTo(boids[j].x,boids[j].y); ctx.stroke()
                    }
                }
            }

            for(const b of boids){
                const v=rd.getV(b.x,b.y)
                ctx.beginPath()
                ctx.arc(b.x,b.y,1.2+v*1.8,0,Math.PI*2)
                ctx.fillStyle=`rgba(${rgb},${(isLight?.10+v*.45:.13+v*.55).toFixed(3)})`
                ctx.fill()
            }
        }

        frame()
        return()=>{
            cancelAnimationFrame(animId)
            window.removeEventListener('mousemove',onMove)
            ro.disconnect(); io.disconnect()
        }
    }, [isLight])

    return (
        <canvas
            ref={canvasRef}
            className='absolute inset-0 w-full h-full pointer-events-none'
        />
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// CTA BANNER
// ─────────────────────────────────────────────────────────────────────────────
function CTABanner({ isLight }: { isLight: boolean }) {
    const sectionRef = useRef<HTMLElement>(null)

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ['start end', 'center center'],
    })
    const sp = useSpring(scrollYProgress, { stiffness: 55, damping: 22 })

    const subY      = useTransform(sp, [0, 1], [60, -30])
    const subOpac   = useTransform(sp, [0, 0.35, 1], [0, 1, 1])
    const subScale  = useTransform(sp, [0, 0.6], [1.08, 1])

    const cardY     = useTransform(sp, [0.1, 0.75], [48, 0])
    const cardOpac  = useTransform(sp, [0.1, 0.55], [0, 1])

    return (
        <section
            ref={sectionRef}
            style={{
                background: isLight ? '#F5F0E8' : '#070707',
                padding: '60px 48px 130px',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <motion.div
                style={{
                    position: 'absolute',
                    inset: 0,
                    y: subY,
                    opacity: subOpac,
                    scale: subScale,
                }}
            >
                <SubstrateContained isLight={isLight} />
            </motion.div>

            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: isLight
                    ? 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, rgba(245,240,232,0.82) 100%)'
                    : 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, rgba(7,7,7,0.80) 100%)',
                zIndex: 1,
            }}/>

            <motion.div
                style={{
                    position: 'relative', zIndex: 2,
                    y: cardY,
                    opacity: cardOpac,
                    maxWidth: 820,
                    margin: '0 auto',
                    borderRadius: 28,
                    background: isLight ? 'rgba(245,240,232,0.55)' : 'rgba(10,10,10,0.55)',
                    backdropFilter: 'blur(28px)',
                    WebkitBackdropFilter: 'blur(28px)',
                    border: isLight
                        ? '1px solid rgba(255,255,255,0.70)'
                        : '1px solid rgba(255,255,255,0.10)',
                    boxShadow: isLight
                        ? '0 8px 40px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.90)'
                        : '0 24px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
                    padding: '80px 64px',
                    textAlign: 'center',
                    overflow: 'hidden',
                }}
            >
                <div style={{
                    position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
                    background: isLight
                        ? 'linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)'
                        : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)',
                    pointerEvents: 'none',
                }}/>

                <p style={{
                    fontSize: 11, letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'rgba(160,120,80,0.65)',
                    marginBottom: 18,
                }}>
                    Limited early access
                </p>

                <h2 style={{
                    fontSize: 'clamp(2rem,4vw,3.4rem)', fontWeight: 800,
                    letterSpacing: '-0.038em',
                    color: isLight ? '#0a0a0a' : '#fff',
                    margin: '0 0 18px',
                }}>
                    Build something beautiful today.
                </h2>

                <p style={{
                    fontSize: '1.07rem',
                    color: isLight ? 'rgba(0,0,0,0.44)' : 'rgba(255,255,255,0.36)',
                    margin: '0 0 44px', lineHeight: 1.68,
                }}>
                    No design skills needed. No waiting. No compromise.
                </p>

                <PhysicsLink
                    href="/auth/sign-up"
                    dark={isLight}
                    style={{ boxShadow: isLight
                        ? '0 4px 20px rgba(0,0,0,0.18)'
                        : '0 4px 24px rgba(255,255,255,0.15)',
                    }}
                >
                    Start for free
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7h10M8 3l4 4-4 4" stroke={isLight?'#F5F0E8':'#070707'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </PhysicsLink>
            </motion.div>
        </section>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────────────────
function Footer({ isLight }: { isLight: boolean }) {
  const bg      = isLight ? '#F5F0E8'              : '#070707'
  const text    = isLight ? 'rgba(0,0,0,0.38)'     : 'rgba(255,255,255,0.38)'
  const textHov = isLight ? 'rgba(0,0,0,0.75)'     : 'rgba(255,255,255,0.70)'
  const label   = isLight ? 'rgba(0,0,0,0.22)'     : 'rgba(255,255,255,0.22)'
  const border  = isLight ? 'rgba(0,0,0,0.06)'     : 'rgba(255,255,255,0.06)'
  const mark    = isLight ? 'rgba(0,0,0,0.04)'     : 'rgba(255,255,255,0.04)'

  return (
    <footer style={{
      background: bg, borderTop: `1px solid ${border}`,
      padding: '80px 48px 48px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        fontSize: 'clamp(6rem,20vw,18rem)', fontWeight: 900,
        letterSpacing: '-0.05em', lineHeight: 0.88, color: mark,
        userSelect: 'none', pointerEvents: 'none',
        position: 'absolute', bottom: -20, left: 40, zIndex: 0,
      }}>PALM</div>

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 48,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: isLight ? '#F5F0E8' : '#070707',
              }}/>
            </div>
            <span style={{ color: isLight ? 'rgba(0,0,0,0.60)' : 'rgba(255,255,255,0.60)', fontSize: 14, fontWeight: 600 }}>Palm</span>
          </div>
          <p style={{ fontSize: 12, color: label, maxWidth: 200, lineHeight: 1.7 }}>
            Turn ideas into interfaces,<br/>instantly.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 64, flexWrap: 'wrap' }}>
          {[
            { label: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
            { label: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
            { label: 'Legal',   links: ['Privacy', 'Terms', 'Security'] },
          ].map(col => (
            <div key={col.label}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: label, marginBottom: 16 }}>
                {col.label}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(l => (
                  <a
                    key={l} href="#"
                    style={{ fontSize: 13, color: text, textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = textHov)}
                    onMouseLeave={e => (e.currentTarget.style.color = text)}
                  >{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        position: 'relative', zIndex: 1,
        marginTop: 72, paddingTop: 24, borderTop: `1px solid ${border}`,
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
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
  const isLight = (theme === 'system' ? systemTheme : theme) === 'light'

  return (
    <>
      {/* Glass scrollbar — injected globally */}
      <style dangerouslySetInnerHTML={{ __html: SCROLLBAR_CSS }}/>

      <CustomCursor />
      <Nav isLight={isLight} />

      <main style={{ cursor: 'none' }}>
        <Hero       isLight={isLight} />
        <HowItWorks isLight={isLight} />
        <CameraSection isLight={isLight} />
        <Features   isLight={isLight} />
        <FAQ        isLight={isLight} />
        <CTABanner  isLight={isLight} />
        <Footer     isLight={isLight} />
      </main>

      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50 }}>
        <GlassTooltip content="Toggle theme" side="left">
          <ThemeToggle />
        </GlassTooltip>
      </div>
    </>
  )
}