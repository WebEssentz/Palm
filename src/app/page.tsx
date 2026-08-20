'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion'
import { useTheme } from 'next-themes'
import ParticleBackground from '@/components/home/particle-background'
import { ThemeToggle } from '@/components/theme/toggle'
import { GlassTooltip } from '@/components/ui/glass-tooltip'
import Loading from '@/app/(protected)/dashboard/loading'

// ─── Constants ────────────────────────────────────────────────────────────────
const EX = [0.16, 1, 0.3, 1] as const
const WORDS = ['instantly.', 'effortlessly.', 'beautifully.', 'magically.']

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700;14..32,800;14..32,900&display=swap');
  html, body, *, *::before, *::after {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  * { scrollbar-width: thin; scrollbar-color: rgba(128,128,128,0.22) transparent; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.24); border-radius: 9999px; }
  @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }
`

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useIsMobile(bp = 768) {
  const [m, setM] = useState(false)
  useEffect(() => {
    const fn = () => setM(window.innerWidth < bp)
    fn()
    window.addEventListener('resize', fn, { passive: true })
    return () => window.removeEventListener('resize', fn)
  }, [bp])
  return m
}

function useTypewriter() {
  const [text, setText] = useState('')
  const [idx, setIdx] = useState(0)
  const [deleting, setDel] = useState(false)

  useEffect(() => {
    const word = WORDS[idx]
    if (!deleting && text === word) {
      const t = setTimeout(() => setDel(true), 2400)
      return () => clearTimeout(t)
    }
    if (deleting && text === '') {
      setDel(false); setIdx(i => (i + 1) % WORDS.length); return
    }
    const t = setTimeout(
      () => setText(deleting ? text.slice(0, -1) : word.slice(0, text.length + 1)),
      deleting ? 34 : 68,
    )
    return () => clearTimeout(t)
  }, [text, idx, deleting])

  return text
}

function useStaticTypewriter(full: string, onDone: () => void) {
  const [text, setText] = useState('')
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    if (text === full) { done.current = true; onDone(); return }
    const t = setTimeout(() => setText(full.slice(0, text.length + 1)), 52)
    return () => clearTimeout(t)
  }, [text, full, onDone])

  return text
}

// ─── FadeIn ───────────────────────────────────────────────────────────────────
function FadeIn({
  children, delay = 0, style = {},
}: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  return (
    <motion.div
      style={style}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.75, ease: EX, delay }}
    >
      {children}
    </motion.div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav({ isLight }: { isLight: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const text = isLight ? '#0a0a0a' : '#ffffff'
  const muted = isLight ? 'rgba(0,0,0,0.44)' : 'rgba(255,255,255,0.44)'
  const navBg = scrolled
    ? (isLight ? 'rgba(255,255,255,0.86)' : 'rgba(10,10,10,0.88)')
    : 'transparent'
  const border = scrolled
    ? (isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)')
    : '1px solid transparent'

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <motion.nav
        initial={{ y: -24, opacity: 0 }}
        animate={{
          y: scrolled ? 12 : 0, opacity: 1,
          maxWidth: scrolled ? 600 : 2000,
          borderRadius: scrolled ? 9999 : 0,
          paddingTop: scrolled ? 10 : 18,
          paddingBottom: scrolled ? 10 : 18,
          paddingLeft: scrolled ? 20 : (isMobile ? 20 : 48),
          paddingRight: scrolled ? 20 : (isMobile ? 20 : 48),
        }}
        transition={{ duration: 0.44, ease: EX }}
        style={{
          pointerEvents: 'auto', width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: navBg,
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          border,
          boxShadow: scrolled ? (isLight ? '0 1px 24px rgba(0,0,0,0.07)' : '0 1px 24px rgba(0,0,0,0.44)') : 'none',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: isLight ? '#fff' : '#0a0a0a' }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: text }}>Palm</span>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 32 }}>
          {!isMobile && (['Features', 'Pricing', 'Docs'] as const).map(label => (
            <a key={label} href="#" style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em', color: muted, textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = text)}
              onMouseLeave={e => (e.currentTarget.style.color = muted)}
            >{label}</a>
          ))}
          <Link href="/auth/sign-up" style={{
            padding: isMobile ? '7px 14px' : '8px 18px', borderRadius: 9999,
            background: text, color: isLight ? '#fff' : '#0a0a0a',
            fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em',
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}>Get started</Link>
        </div>
      </motion.nav>
    </div>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ isLight }: { isLight: boolean }) {
  const isMobile = useIsMobile()
  const ref      = useRef<HTMLElement>(null)

  const [staticDone, setStaticDone] = useState(false)
  const [showRest, setShowRest]     = useState(false)

  const onStaticDone = useRef(() => setStaticDone(true))
  const staticText   = useStaticTypewriter('Turn ideas into interfaces,', onStaticDone.current)
  const typed        = useTypewriter()

  // Wait for first word to finish typing + small breath, then fade in smoothly
  useEffect(() => {
    if (!staticDone) return
    const t = setTimeout(() => setShowRest(true), 1100)
    return () => clearTimeout(t)
  }, [staticDone])

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y       = useTransform(scrollYProgress, [0, 1], [0, -90])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  const text  = isLight ? '#0a0a0a' : '#ffffff'
  const muted = isLight ? 'rgba(0,0,0,0.44)' : 'rgba(255,255,255,0.44)'

  const headSize = isMobile ? 'clamp(2.2rem, 9vw, 3rem)' : 'clamp(2.8rem, 5.5vw, 5rem)'

  return (
    <section ref={ref} style={{
      position: 'relative', minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', background: isLight ? '#ffffff' : '#0a0a0a',
    }}>
      <ParticleBackground isLight={isLight} />

      <motion.div style={{ y, opacity, position: 'relative', zIndex: 10, width: '100%' }}>
        <div style={{ textAlign: 'center', padding: '0 48px', maxWidth: 1100, margin: '0 auto' }}>

          {/* Static heading — types out on load */}
          <h1 style={{ fontSize: headSize, fontWeight: 600, lineHeight: 1.12, letterSpacing: '-0.03em', color: text, margin: 0, minHeight: '1.2em' }}>
            {staticText}
            {!staticDone && (
              <span style={{ width: 2, height: '0.75em', background: text, marginLeft: 3, borderRadius: 2, display: 'inline-block', animation: 'blink 1s step-end infinite' }} />
            )}
          </h1>

          {/* Typewriter line — starts after static is done */}
          {staticDone && (
            <div style={{
              fontSize: headSize, fontWeight: 600, lineHeight: 1.12, letterSpacing: '-0.03em',
              color: text, minHeight: '1.2em',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {typed}
              <span style={{ width: 2, height: '0.75em', background: text, marginLeft: 3, borderRadius: 2, display: 'inline-block', animation: 'blink 1s step-end infinite' }} />
            </div>
          )}

          {/* Subtitle + buttons — fade in once first word is fully typed */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={showRest ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <p style={{
              fontSize: isMobile ? '0.95rem' : '1rem', color: muted,
              lineHeight: 1.72, maxWidth: 460, margin: `${isMobile ? 20 : 28}px auto 0`,
            }}>
              The fastest way from idea to something you can actually show people.
            </p>
          </motion.div>

        </div>
      </motion.div>

      {/* Scroll line */}
      <motion.div
        initial={{ opacity: 0 }} animate={showRest ? { opacity: 1 } : { opacity: 0 }} transition={{ delay: 1, duration: 1 }}
        style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 1, height: 38,
            background: isLight
              ? 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.2))'
              : 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.2))',
          }}
        />
      </motion.div>
    </section>
  )
}

// ─── Prompt Stage ─────────────────────────────────────────────────────────────
const PROMPTS = [
  'A dark dashboard for a crypto analytics startup',
  'Mobile onboarding for a fitness app, clean and minimal',
  'SaaS pricing page, three tiers, glassmorphism aesthetic',
  'Landing page for an AI writing tool, bold typography',
  'E-commerce product page for a luxury fashion brand',
  'Admin panel with sidebar nav and data tables, minimal',
]

function PromptStage() {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: false, margin: '-20%' })

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const spotOpacity = useTransform(scrollYProgress, [0.05, 0.25, 0.75, 0.95], [0, 1, 1, 0])
  const boxY        = useTransform(scrollYProgress, [0.05, 0.3],  [40, 0])
  const boxOpacity  = useTransform(scrollYProgress, [0.05, 0.3],  [0, 1])

  const [promptIdx, setPromptIdx] = useState(0)
  const [typed,     setTyped]     = useState('')
  const [deleting,  setDeleting]  = useState(false)

  useEffect(() => {
    if (!inView) return
    const word = PROMPTS[promptIdx]
    if (!deleting && typed === word) {
      const t = setTimeout(() => setDeleting(true), 2200)
      return () => clearTimeout(t)
    }
    if (deleting && typed === '') {
      setDeleting(false)
      setPromptIdx(i => (i + 1) % PROMPTS.length)
      return
    }
    const t = setTimeout(
      () => setTyped(deleting ? typed.slice(0, -1) : word.slice(0, typed.length + 1)),
      deleting ? 18 : 52,
    )
    return () => clearTimeout(t)
  }, [typed, promptIdx, deleting, inView])

  return (
    <section ref={ref} style={{
      position: 'relative', background: '#000',
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>

      {/* Spotlight cone from top */}
      <motion.div style={{
        position: 'absolute', top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '70%', height: '100%',
        background: 'radial-gradient(ellipse 55% 55% at 50% 0%, rgba(255,255,255,0.11) 0%, transparent 70%)',
        opacity: spotOpacity,
        pointerEvents: 'none',
      }} />

      {/* Soft pool of light behind the box */}
      <motion.div style={{
        position: 'absolute',
        width: 700, height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(255,255,255,0.05) 0%, transparent 70%)',
        opacity: spotOpacity,
        pointerEvents: 'none',
      }} />

      {/* Dotted grid — same treatment as hero but dark */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        pointerEvents: 'none',
      }} />

      <motion.div style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: 680,
        padding: '0 32px',
        y: boxY, opacity: boxOpacity,
      }}>

        {/* Label */}
        <p style={{
          fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.28)', margin: '0 0 22px', textAlign: 'center',
        }}>Describe anything</p>

        {/* Glass textarea */}
        <div style={{
          borderRadius: 22,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          boxShadow: [
            '0 0 0 1px rgba(255,255,255,0.04)',
            '0 32px 80px rgba(0,0,0,0.7)',
            '0 8px 24px rgba(0,0,0,0.5)',
            'inset 0 1px 0 rgba(255,255,255,0.12)',
          ].join(', '),
          padding: '28px 32px 22px',
          minHeight: 160,
          position: 'relative',
        }}>

          {/* Specular rim */}
          <div style={{
            position: 'absolute', top: 0, left: '8%', right: '8%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)',
          }} />

          {/* Typed prompt */}
          <p style={{
            fontSize: '1.08rem', lineHeight: 1.72,
            color: 'rgba(255,255,255,0.82)',
            margin: 0, minHeight: '5em',
            letterSpacing: '-0.012em', fontWeight: 400,
          }}>
            {typed}
            <span style={{
              display: 'inline-block', width: 2, height: '1em',
              background: 'rgba(255,255,255,0.75)',
              marginLeft: 2, borderRadius: 1,
              verticalAlign: 'text-bottom',
              animation: 'blink 1s step-end infinite',
            }} />
          </p>

          {/* Bottom row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 20, paddingTop: 16,
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '-0.01em' }}>
              Palm · UI Generator
            </span>
            {/* Send button */}
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(255,255,255,0.88)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(255,255,255,0.15)',
            }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M7 11V3M3 7l4-4 4 4" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        <p style={{
          textAlign: 'center', fontSize: 12,
          color: 'rgba(255,255,255,0.18)',
          margin: '22px 0 0', letterSpacing: '-0.01em',
        }}>
          No design skills. No templates. Just describe.
        </p>
      </motion.div>
    </section>
  )
}

// ─── Statement — inverted section, word-by-word scroll reveal ─────────────────
function Statement({ isLight }: { isLight: boolean }) {
  const isMobile = useIsMobile()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })

  const bg = isLight ? '#0a0a0a' : '#f4f4f4'
  const text = isLight ? '#ffffff' : '#0a0a0a'
  const words = 'Palm is your AI design partner, built for founders who move fast and ship without compromise.'.split(' ')

  return (
    <section style={{ background: bg, padding: isMobile ? '100px 28px' : '160px 64px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div
          ref={ref}
          style={{
            fontSize: isMobile ? 'clamp(1.8rem, 5.5vw, 2.4rem)' : 'clamp(2.4rem, 4.2vw, 3.8rem)',
            fontWeight: 700, lineHeight: 1.22, letterSpacing: '-0.035em',
            display: 'flex', flexWrap: 'wrap', gap: '0 0.26em', alignItems: 'baseline',
          }}
        >
          {words.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0.1 }}
              animate={inView ? { opacity: 1 } : { opacity: 0.1 }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: EX }}
              style={{ display: 'inline-block', color: text }}
            >
              {word}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    n: '01', title: 'Describe your idea',
    body: 'Type anything in plain language — "dark dashboard for crypto analytics" or "mobile onboarding for a fitness app". No syntax, no templates.',
  },
  {
    n: '02', title: 'Palm materializes it',
    body: 'Watch your interface appear in real time. Every layout, color, and component generated with production intent.',
  },
  {
    n: '03', title: 'Refine and ship',
    body: 'Iterate with follow-up prompts. Export clean React, copy the code, or push to Figma. Zero friction, start to finish.',
  },
]

function HowItWorks({ isLight }: { isLight: boolean }) {
  const isMobile = useIsMobile()
  const text = isLight ? '#0a0a0a' : '#ffffff'
  const muted = isLight ? 'rgba(0,0,0,0.44)' : 'rgba(255,255,255,0.44)'
  const line = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'
  const num = isLight ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.09)'

  return (
    <section id="how" style={{ background: isLight ? '#ffffff' : '#0a0a0a', padding: isMobile ? '80px 24px' : '140px 48px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <FadeIn>
          <p style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: muted, margin: '0 0 12px' }}>How it works</p>
          <h2 style={{
            fontSize: isMobile ? 'clamp(1.8rem, 7vw, 2.4rem)' : 'clamp(2rem, 4vw, 3.2rem)',
            fontWeight: 700, letterSpacing: '-0.035em', color: text, margin: '0 0 80px', maxWidth: 460,
          }}>Three steps from idea to interface.</h2>
        </FadeIn>

        {STEPS.map((s, i) => (
          <FadeIn key={s.n} delay={i * 0.1}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '80px 1fr 1.2fr',
              gap: isMobile ? 8 : '0 48px',
              padding: `${isMobile ? 28 : 44}px 0`,
              borderTop: `1px solid ${line}`,
            }}>
              <span style={{ fontSize: isMobile ? '1.8rem' : 'clamp(2.2rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.05em', color: num, lineHeight: 1 }}>
                {s.n}
              </span>
              <h3 style={{
                fontSize: isMobile ? '1.08rem' : 'clamp(1.2rem, 2vw, 1.55rem)',
                fontWeight: 700, letterSpacing: '-0.025em', color: text,
                margin: isMobile ? '4px 0 8px' : 0,
              }}>{s.title}</h3>
              <p style={{ fontSize: '0.93rem', lineHeight: 1.75, color: muted, margin: 0 }}>{s.body}</p>
            </div>
          </FadeIn>
        ))}
        <div style={{ borderTop: `1px solid ${line}` }} />
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATS = [
  { title: 'Describe once, ship forever', body: 'Plain language in, production-ready UI out. Palm interprets intent — every output looks like a designer spent weeks on it.', span: 2 },
  { title: 'Export-ready code', body: 'Clean React, HTML, or Figma. Copy, paste, ship.', span: 1 },
  { title: 'Liquid glass design system', body: 'Every output inherits a refined aesthetic. Dark, light, and everything in between.', span: 1 },
  { title: 'Any platform', body: 'Web, mobile, tablet — Palm designs for the canvas you give it. Responsive by default.', span: 2 },
  { title: 'Real-time refinement', body: 'Iterate with follow-up prompts. Palm remembers context and improves every iteration.', span: 2 },
]

function Features({ isLight }: { isLight: boolean }) {
  const isMobile = useIsMobile()
  const text = isLight ? '#0a0a0a' : '#ffffff'
  const muted = isLight ? 'rgba(0,0,0,0.44)' : 'rgba(255,255,255,0.44)'
  const cardBg = isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)'
  const cardBorder = isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)'

  return (
    <section style={{ background: isLight ? '#f9f9f9' : '#0d0d0d', padding: isMobile ? '80px 24px' : '140px 48px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <FadeIn style={{ textAlign: 'center', marginBottom: isMobile ? 48 : 72 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: muted, margin: '0 0 12px' }}>Why Palm</p>
          <h2 style={{ fontSize: isMobile ? 'clamp(1.8rem, 7vw, 2.4rem)' : 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 700, letterSpacing: '-0.035em', color: text, margin: 0 }}>
            Every detail. No friction.
          </h2>
        </FadeIn>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 12 }}>
          {FEATS.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.07} style={{ gridColumn: isMobile ? 'auto' : `span ${f.span}` }}>
              <div style={{
                background: cardBg, border: `1px solid ${cardBorder}`,
                borderRadius: 18, height: '100%', boxSizing: 'border-box',
                padding: isMobile ? '28px 24px' : `${f.span === 2 ? 40 : 32}px ${f.span === 2 ? 36 : 28}px`,
              }}>
                <h3 style={{
                  fontSize: f.span === 2 ? (isMobile ? '1.1rem' : '1.35rem') : (isMobile ? '1rem' : '1.1rem'),
                  fontWeight: 700, letterSpacing: '-0.025em', color: text, margin: '0 0 10px',
                }}>{f.title}</h3>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.72, color: muted, margin: 0 }}>{f.body}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'What exactly is Palm?', a: 'Palm is an AI UI generator with a design point of view. Describe what you want in plain English and watch a polished, production-ready interface appear. No drag-and-drop, no templates.' },
  { q: 'Is it free to start?', a: 'Yes — early access is completely free, no credit card required. Early users get priority access and preferential pricing, permanently.' },
  { q: 'What can I export?', a: 'Clean React (TypeScript), raw HTML/CSS, or Figma-ready components. Everything Palm generates is production-intent — shippable, not just pretty.' },
  { q: 'Does it handle responsive UI?', a: "Absolutely. Whether you're describing a 375px mobile flow or a 1440px dashboard, the output is responsive and intentional by default." },
  { q: 'How is Palm different from v0 or other AI design tools?', a: "Palm has a point of view. It's built around a specific aesthetic — refined motion, typographic craft — that makes every output feel considered, not computed." },
]

function FAQ({ isLight }: { isLight: boolean }) {
  const [open, setOpen] = useState<number | null>(null)
  const isMobile = useIsMobile()
  const text = isLight ? '#0a0a0a' : '#ffffff'
  const muted = isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.42)'
  const line = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'

  return (
    <section style={{ background: isLight ? '#ffffff' : '#0a0a0a', padding: isMobile ? '80px 24px' : '140px 48px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <FadeIn style={{ marginBottom: 60 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: muted, margin: '0 0 12px' }}>FAQ</p>
          <h2 style={{ fontSize: isMobile ? '2rem' : '2.8rem', fontWeight: 700, letterSpacing: '-0.035em', color: text, margin: 0 }}>
            Questions?
          </h2>
        </FadeIn>

        {FAQS.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.55, ease: EX, delay: i * 0.07 }}
            style={{ borderTop: `1px solid ${line}`, overflow: 'hidden' }}
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: `${isMobile ? 20 : 26}px 0`, background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left', gap: 16,
              }}
            >
              <span style={{ fontSize: isMobile ? '0.95rem' : '1.04rem', fontWeight: 600, letterSpacing: '-0.018em', color: text }}>
                {item.q}
              </span>
              <motion.div
                animate={{ rotate: open === i ? 45 : 0 }}
                transition={{ duration: 0.22, ease: EX }}
                style={{ flexShrink: 0, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: `1px solid ${line}` }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1v8M1 5h8" stroke={text} strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </motion.div>
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: EX }}
                  style={{ overflow: 'hidden' }}
                >
                  <p style={{ paddingBottom: 24, paddingRight: isMobile ? 0 : 40, fontSize: '0.92rem', lineHeight: 1.78, color: muted, margin: 0 }}>
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
        <div style={{ borderTop: `1px solid ${line}` }} />
      </div>
    </section>
  )
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────
function CTABanner({ isLight }: { isLight: boolean }) {
  const isMobile = useIsMobile()
  const bg = isLight ? '#0a0a0a' : '#f4f4f4'
  const text = isLight ? '#ffffff' : '#0a0a0a'
  const muted = isLight ? 'rgba(255,255,255,0.44)' : 'rgba(0,0,0,0.44)'
  const btnBg = isLight ? '#ffffff' : '#0a0a0a'
  const btnTx = isLight ? '#0a0a0a' : '#ffffff'

  return (
    <section style={{ background: bg, padding: isMobile ? '80px 24px 100px' : '140px 48px 160px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
        <FadeIn>
          <p style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: muted, margin: '0 0 18px' }}>
            Limited early access
          </p>
          <h2 style={{
            fontSize: isMobile ? 'clamp(2rem, 8vw, 2.8rem)' : 'clamp(2.4rem, 5vw, 4rem)',
            fontWeight: 700, letterSpacing: '-0.038em', color: text, margin: '0 0 14px',
          }}>Build something beautiful today.</h2>
          <p style={{ fontSize: isMobile ? '0.95rem' : '1.04rem', color: muted, margin: '0 0 40px', lineHeight: 1.65 }}>
            No design skills needed. No waiting. No compromise.
          </p>
          <Link href="/auth/sign-up" style={{
            padding: '14px 32px', borderRadius: 9999,
            background: btnBg, color: btnTx,
            fontSize: 15, fontWeight: 600, letterSpacing: '-0.015em',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            Start for free
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── PalmWordmark ─────────────────────────────────────────────────────────────
function PalmWordmark({ color }: { color: string }) {
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end end'], // tighter window = more noticeable
  })

  // P and A: start raised to match M, then drop hard to 0
  const paY = useTransform(scrollYProgress, [0, 0.45, 1], ['0.22em', '0.22em', '0em'])

  return (
    <div ref={ref} aria-hidden="true" style={{
      fontSize: 'clamp(6rem, 22vw, 22rem)',
      fontWeight: 800,
      lineHeight: 0.85,
      color,
      userSelect: 'none',
      pointerEvents: 'none',
      marginBottom: '-0.14em',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    }}>
      {/* P — starts level with M, drops down */}
      <motion.span style={{ display: 'inline-block', marginBottom: paY }}>P</motion.span>

      {/* A — starts level with M, drops down */}
      <motion.span style={{ display: 'inline-block', marginBottom: paY }}>A</motion.span>

      {/* L — permanently raised, never moves */}
      <span style={{ display: 'inline-block', marginBottom: '0.18em' }}>L</span>

      {/* M — permanently raised, never moves */}
      <span style={{ display: 'inline-block', marginBottom: '0.22em' }}>M</span>
    </div>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({ isLight }: { isLight: boolean }) {
  const isMobile = useIsMobile()
  const bg = isLight ? '#ffffff' : '#0a0a0a'
  const text = isLight ? '#0a0a0a' : '#ffffff'
  const textMuted = isLight ? 'rgba(0,0,0,0.44)' : 'rgba(255,255,255,0.44)'
  const label = isLight ? 'rgba(0,0,0,0.36)' : 'rgba(255,255,255,0.36)'
  const border = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'

  return (
    <footer style={{ background: bg, borderTop: `1px solid ${border}`, padding: isMobile ? '48px 24px 0' : '64px 48px 0', position: 'relative', overflow: 'hidden' }}>

      {/* Top row: tagline left, columns right */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: isMobile ? 40 : 48, marginBottom: isMobile ? 56 : 80 }}>

        {/* Tagline */}
        <p style={{ fontSize: isMobile ? '1.3rem' : '1.5rem', fontWeight: 500, letterSpacing: '-0.02em', color: text, margin: 0, maxWidth: 340 }}>
          Turn ideas into interfaces, instantly.
        </p>

        {/* Link columns */}
        <div style={{ display: 'flex', gap: isMobile ? 40 : 80, flexWrap: 'wrap' }}>
          {[
            { label: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
            { label: 'Resources', links: ['About', 'Blog', 'Careers', 'Privacy', 'Terms'] },
          ].map(col => (
            <div key={col.label}>
              <p style={{ fontSize: 13, fontWeight: 500, color: label, margin: '0 0 16px' }}>{col.label}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {col.links.map(l => (
                  <a key={l} href="#"
                    style={{ fontSize: 15, fontWeight: 400, color: text, textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = textMuted)}
                    onMouseLeave={e => (e.currentTarget.style.color = text)}
                  >{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <PalmWordmark color={text} />
    </footer>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <Loading />
  const isLight = (theme === 'system' ? systemTheme : theme) === 'light'

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <Nav isLight={isLight} />
      <main>
        <Hero isLight={isLight} />
        <PromptStage />
        <Statement isLight={isLight} />
        <HowItWorks isLight={isLight} />
        <Features isLight={isLight} />
        <FAQ isLight={isLight} />
        <CTABanner isLight={isLight} />
        <Footer isLight={isLight} />
      </main>
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50 }}>
        <GlassTooltip content="Toggle theme" side="left">
          <ThemeToggle />
        </GlassTooltip>
      </div>
    </>
  )
}