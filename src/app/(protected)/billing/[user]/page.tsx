'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useConvexAuth, useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../../../../convex/_generated/api'
import { useRouter } from 'next/navigation'
import {
  Sparkles, Palette, Layers, ImagePlus, Move, Magnet, MessageSquare,
  ShieldCheck, Zap, RefreshCw, ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import SubscribeButton from '@/components/buttons/checkout'
import { ThemeToggle } from '@/components/theme/toggle'
import { GlassTooltip } from '@/components/ui/glass-tooltip'
import ParticleBackground from '@/components/home/particle-background'
import Loading from '@/app/(protected)/dashboard/loading'
import { useIsMobile } from '@/hooks/use-mobile'

const SPRING_SNAPPY = { type: 'spring', stiffness: 400, damping: 18 } as const
const SPRING_SOFT   = { type: 'spring', stiffness: 180, damping: 22 } as const
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

// ─────────────────────────────────────────────────────────────────────────────
// CIRCUIT FIELD
// ─────────────────────────────────────────────────────────────────────────────
type ViaPoint = { x: number; y: number; begin: number }
type Trace    = { id: string; d: string; dur: number; begin: number; vias: ViaPoint[] }

const TRACES: Trace[] = [
  {
    id: 'circuit-t1-billing',
    d: 'M -50 200 L 300 200 L 300 400 L 700 400 L 700 100 L 1100 100 L 1100 500 L 1450 500',
    dur: 7, begin: 0,
    vias: [
      { x: 300, y: 200, begin: 0.85 }, { x: 300, y: 400, begin: 1.6 },
      { x: 700, y: 400, begin: 2.8 },  { x: 700, y: 100, begin: 3.6 },
      { x: 1100, y: 100, begin: 4.8 }, { x: 1100, y: 500, begin: 6.0 },
    ],
  },
  {
    id: 'circuit-t2-billing',
    d: 'M -50 620 L 200 620 L 200 820 L 600 820 L 600 520 L 900 520 L 900 720 L 1450 720',
    dur: 8.5, begin: 1.5,
    vias: [
      { x: 200, y: 620, begin: 1.0 }, { x: 200, y: 820, begin: 1.9 },
      { x: 600, y: 820, begin: 3.3 }, { x: 600, y: 520, begin: 4.3 },
      { x: 900, y: 520, begin: 5.6 }, { x: 900, y: 720, begin: 6.7 },
    ],
  },
  {
    id: 'circuit-t3-billing',
    d: 'M 1450 450 L 950 450 L 950 250 L 550 250 L 550 450 L 150 450 L 150 150 L -50 150',
    dur: 6.4, begin: 3.0,
    vias: [
      { x: 950, y: 450, begin: 0.7 }, { x: 950, y: 250, begin: 1.4 },
      { x: 550, y: 250, begin: 2.5 }, { x: 550, y: 450, begin: 3.2 },
      { x: 150, y: 450, begin: 4.4 }, { x: 150, y: 150, begin: 5.1 },
    ],
  },
  {
    id: 'circuit-t4-billing',
    d: 'M -50 50 L 400 50 L 400 250 L 800 250 L 800 50 L 1200 50 L 1200 350 L 1450 350',
    dur: 9, begin: 0.6,
    vias: [
      { x: 400, y: 50, begin: 1.1 },  { x: 400, y: 250, begin: 2.2 },
      { x: 800, y: 250, begin: 3.6 }, { x: 800, y: 50, begin: 4.7 },
      { x: 1200, y: 50, begin: 6.1 }, { x: 1200, y: 350, begin: 7.4 },
    ],
  },
  {
    id: 'circuit-t5-billing',
    d: 'M -50 850 L 300 850 L 300 650 L 700 650 L 700 850 L 1100 850 L 1100 750 L 1450 750',
    dur: 7.8, begin: 2.4,
    vias: [
      { x: 300, y: 850, begin: 0.9 }, { x: 300, y: 650, begin: 1.8 },
      { x: 700, y: 650, begin: 3.2 }, { x: 700, y: 850, begin: 4.1 },
      { x: 1100, y: 850, begin: 5.7 }, { x: 1100, y: 750, begin: 6.5 },
    ],
  },
]

// Lighter subset for mobile
const MOBILE_TRACES = [TRACES[0], TRACES[2], TRACES[4]]

function CircuitField({ isLight, isMobile }: { isLight: boolean; isMobile: boolean }) {
  const traces     = isMobile ? MOBILE_TRACES : TRACES
  const traceColor = isLight ? 'rgba(0,0,0,0.055)'        : 'rgba(160,120,80,0.12)'
  const viaColor   = isLight ? 'rgba(160,120,80,0.35)'    : 'rgba(160,120,80,0.55)'
  const pulseCore  = isLight ? '#A07850'                  : '#FFD9A8'
  const pulseGlow  = isLight ? 'rgba(160,120,80,0.45)'   : 'rgba(255,217,168,0.55)'

  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 1400 900"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, opacity: isLight ? 0.55 : 0.85 }}
    >
      <defs>
        <radialGradient id="billing-grid-glow" cx="50%" cy="42%" r="55%">
          <stop offset="0%"   stopColor="#A07850" stopOpacity={isLight ? 0.10 : 0.14} />
          <stop offset="100%" stopColor="#A07850" stopOpacity="0" />
        </radialGradient>
        <filter id="billing-pulse-blur" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        {traces.map(t => (
          <path key={`def-${t.id}`} id={t.id} d={t.d} fill="none" />
        ))}
      </defs>

      {Array.from({ length: 15 }).map((_, i) => (
        <line key={`v${i}`} x1={(i / 14) * 1400} y1={0} x2={(i / 14) * 1400} y2={900}
          stroke={isLight ? 'rgba(0,0,0,0.025)' : 'rgba(160,120,80,0.04)'} strokeWidth={0.5} />
      ))}
      {Array.from({ length: 10 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={(i / 9) * 900} x2={1400} y2={(i / 9) * 900}
          stroke={isLight ? 'rgba(0,0,0,0.025)' : 'rgba(160,120,80,0.04)'} strokeWidth={0.5} />
      ))}

      <ellipse cx="700" cy="380" rx="520" ry="340" fill="url(#billing-grid-glow)" />

      {traces.map(t => (
        <path key={t.id} d={t.d} fill="none" stroke={traceColor} strokeWidth={1.4} />
      ))}

      {traces.map(t => t.vias.map((v, i) => (
        <circle key={`${t.id}-via-${i}`} cx={v.x} cy={v.y} r={3} fill={viaColor}>
          <animate
            attributeName="opacity" values="0.25;1;0.25" dur="0.9s"
            begin={`${t.begin + v.begin}s; ${t.id}-via-${i}.end+${t.dur - 0.9}s`}
            fill="freeze"
          />
        </circle>
      )))}

      {traces.map(t => (
        <g key={`pulse-${t.id}`}>
          <circle r={8} fill={pulseGlow} filter="url(#billing-pulse-blur)">
            <animateMotion dur={`${t.dur}s`} begin={`${t.begin}s`} repeatCount="indefinite" rotate="auto">
              <mpath xlinkHref={`#${t.id}`} />
            </animateMotion>
          </circle>
          <circle r={2.4} fill={pulseCore}>
            <animateMotion dur={`${t.dur}s`} begin={`${t.begin}s`} repeatCount="indefinite" rotate="auto">
              <mpath xlinkHref={`#${t.id}`} />
            </animateMotion>
          </circle>
        </g>
      ))}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMET FIELD
// ─────────────────────────────────────────────────────────────────────────────
const COMETS = [
  { top: '6%',  size: 220, angle: -16, dur: 16, delay: 0 },
  { top: '28%', size: 160, angle: -20, dur: 22, delay: 6 },
  { top: '58%', size: 260, angle: -14, dur: 19, delay: 11 },
  { top: '82%', size: 180, angle: -18, dur: 24, delay: 3 },
]

function CometField({ isLight, isMobile }: { isLight: boolean; isMobile: boolean }) {
  const comets = isMobile ? COMETS.slice(0, 2) : COMETS
  const tail = isLight
    ? 'linear-gradient(90deg, transparent, rgba(160,120,80,0.0), rgba(160,120,80,0.35), rgba(255,255,255,0.7))'
    : 'linear-gradient(90deg, transparent, rgba(160,120,80,0.0), rgba(255,217,168,0.35), rgba(255,255,255,0.85))'

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {comets.map((c, i) => (
        <motion.div
          key={i}
          initial={{ x: '-30vw' }}
          animate={{ x: '130vw' }}
          transition={{ duration: c.dur, delay: c.delay, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute', top: c.top, left: 0,
            width: isMobile ? c.size * 0.65 : c.size, height: 2,
            background: tail,
            transform: `rotate(${c.angle}deg)`,
            filter: 'blur(0.5px)',
            opacity: isLight ? 0.5 : 0.7,
          }}
        >
          <div style={{
            position: 'absolute', right: 0, top: -1.5,
            width: 5, height: 5, borderRadius: '50%',
            background: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,1)',
            boxShadow: isLight
              ? '0 0 10px rgba(160,120,80,0.6)'
              : '0 0 14px rgba(255,217,168,0.8), 0 0 28px rgba(160,120,80,0.5)',
          }} />
        </motion.div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED PRICE
// ─────────────────────────────────────────────────────────────────────────────
function AnimatedPrice({ value, isLight }: { value: string; isLight: boolean }) {
  return (
    <span style={{ display: 'inline-flex' }}>
      {value.split('').map((c, i) => (
        <motion.span
          key={`${c}-${i}`}
          initial={{ opacity: 0, y: 28, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.25 + i * 0.05 }}
          style={{ display: 'inline-block', color: isLight ? '#0a0a0a' : '#ffffff' }}
        >
          {c}
        </motion.span>
      ))}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE ROW
// ─────────────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Palette,       title: 'AI powered design generation', body: 'Generate unique design variations from a single prompt.' },
  { icon: Layers,        title: 'Smart style guides',           body: 'Auto-generate typography, colors, and brand guidelines.' },
  { icon: ImagePlus,     title: 'Mood board creation',          body: 'Curate and organize visual inspiration for every project.' },
  { icon: Move,          title: 'Infinite canvas workspace',    body: 'Sketch, draw, and arrange ideas on a boundless canvas.' },
  { icon: Magnet,        title: 'Precision snap & alignment',   body: 'Snap shapes to endpoints for pixel-perfect layouts.' },
  { icon: MessageSquare, title: 'AI design assistant chat',      body: 'Get real-time feedback and suggestions as you design.' },
]

function FeatureRow({
  icon: Icon, title, body, isLight, delay, isMobile,
}: {
  icon: typeof Palette
  title: string
  body: string
  isLight: boolean
  delay: number
  isMobile: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay }}
      whileHover={isMobile ? {} : { x: 4 }}
      style={{
        display: 'flex', alignItems: 'flex-start',
        gap: isMobile ? 12 : 14,
        padding: isMobile ? '11px 12px' : '13px 14px',
        borderRadius: 14,
        background: isLight ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.035)',
        border: isLight ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.06)',
        transition: 'border-color 0.2s, background 0.2s',
      }}
      onMouseEnter={isMobile ? undefined : e => {
        e.currentTarget.style.borderColor = 'rgba(160,120,80,0.35)'
        e.currentTarget.style.background = isLight ? 'rgba(160,120,80,0.06)' : 'rgba(160,120,80,0.08)'
      }}
      onMouseLeave={isMobile ? undefined : e => {
        e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'
        e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.035)'
      }}
    >
      <div style={{
        width: isMobile ? 28 : 30, height: isMobile ? 28 : 30,
        borderRadius: 9, flexShrink: 0,
        background: 'rgba(160,120,80,0.16)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={isMobile ? 13 : 15} color="#A07850" />
      </div>
      <div>
        <p style={{
          margin: 0, fontSize: isMobile ? 13 : 13.5,
          fontWeight: 600, letterSpacing: '-0.01em',
          color: isLight ? '#0a0a0a' : '#ffffff',
        }}>{title}</p>
        <p style={{
          margin: '2px 0 0', fontSize: isMobile ? 11.5 : 12, lineHeight: 1.55,
          color: isLight ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.36)',
        }}>{body}</p>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUST STRIP
// ─────────────────────────────────────────────────────────────────────────────
function TrustStrip({ isLight, isMobile }: { isLight: boolean; isMobile: boolean }) {
  const items = [
    { icon: ShieldCheck, label: 'Secure payments' },
    { icon: RefreshCw,   label: 'Cancel anytime' },
    { icon: Zap,         label: 'Instant access' },
  ]
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.9 }}
      style={{
        display: 'flex', justifyContent: 'center',
        gap: isMobile ? 8 : 10,
        flexWrap: 'wrap',
        marginTop: isMobile ? 20 : 28,
      }}
    >
      {items.map(({ icon: Icon, label }) => (
        <div key={label} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: isMobile ? '7px 13px' : '8px 16px',
          borderRadius: 9999,
          background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
          border: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.07)',
          fontSize: isMobile ? 11 : 12, fontWeight: 500,
          color: isLight ? 'rgba(0,0,0,0.50)' : 'rgba(255,255,255,0.46)',
        }}>
          <Icon size={isMobile ? 12 : 13} color="#A07850" />
          {label}
        </div>
      ))}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { isLoading, isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()


  const currentUser = useQuery(
  api.user.getCurrentUser,
  isAuthenticated ? {} : 'skip'
)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    // Case 1: Convex resolved and there's no session at all
    if (!isLoading && !isAuthenticated) {
      router.replace('/')
      return
    }
    // Case 2: JWT valid but user row is gone from the DB (deleted account)
    // currentUser === null means the query ran and returned nothing
    if (!isLoading && isAuthenticated && currentUser === null) {
      signOut().then(() => router.replace('/'))
    }
  }, [isLoading, isAuthenticated, currentUser, router, signOut])

  // useIsMobile returns false until window is measured — safe to call
  // unconditionally (no hooks-after-early-return problem)
  const isMobile = useIsMobile()

  const rotX = useSpring(0, { stiffness: 260, damping: 24 })
  const rotY = useSpring(0, { stiffness: 260, damping: 24 })

  if (!mounted || isLoading) return <Loading />
  if (!isAuthenticated || currentUser === null) return null

  const isLight = (theme === 'system' ? systemTheme : theme) === 'light'
  const bg   = isLight ? '#F5F0E8' : '#070707'
  const text = isLight ? '#0a0a0a' : '#ffffff'
  const sub  = isLight ? 'rgba(0,0,0,0.44)' : 'rgba(255,255,255,0.38)'

  // Parallax only meaningful on pointer devices
  const onCardMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) return
    const rect = e.currentTarget.getBoundingClientRect()
    rotX.set(((e.clientY - (rect.top + rect.height / 2)) / rect.height) * -4)
    rotY.set(((e.clientX - (rect.left + rect.width / 2)) / rect.width) * 4)
  }
  const onCardLeave = () => { rotX.set(0); rotY.set(0) }

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: bg, overflow: 'hidden' }}>
      {/* Liquid glass filter defs */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <defs>
          {['dark', 'light'].map(m => (
            <filter
              key={m} id={`pricing-glass-${m}`}
              x="-10%" y="-10%" width="120%" height="120%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="11" result="noise">
                <animate attributeName="baseFrequency" values="0.012 0.018;0.014 0.02;0.012 0.018" dur="14s" repeatCount="indefinite" />
              </feTurbulence>
              <feGaussianBlur in="noise" stdDeviation="1.5" result="blurNoise" />
              <feDisplacementMap in="SourceGraphic" in2="blurNoise" scale="6" xChannelSelector="R" yChannelSelector="G" result="displaced" />
              <feComposite in="displaced" in2="SourceGraphic" operator="atop" />
            </filter>
          ))}
        </defs>
      </svg>

      {/* Particle layer skipped on mobile — heaviest layer */}
      {!isMobile && (
        <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
          <ParticleBackground />
        </div>
      )}
      <CircuitField isLight={isLight} isMobile={isMobile} />
      <CometField  isLight={isLight} isMobile={isMobile} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: isLight
          ? 'radial-gradient(ellipse 60% 50% at 50% 38%, rgba(160,120,80,0.10) 0%, transparent 70%)'
          : 'radial-gradient(ellipse 60% 50% at 50% 38%, rgba(160,120,80,0.14) 0%, transparent 70%)',
      }} />

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 10,
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? '48px 16px 60px' : '72px 24px 80px',
      }}>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
          style={{ textAlign: 'center', marginBottom: isMobile ? 28 : 40 }}
        >
          <span style={{
            fontSize: isMobile ? 10 : 11,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'rgba(160,120,80,0.70)',
          }}>
            Pricing
          </span>
          <h1 style={{
            marginTop: isMobile ? 10 : 14,
            fontSize: isMobile ? 'clamp(1.75rem, 8vw, 2.4rem)' : 'clamp(2.2rem, 5.5vw, 4rem)',
            fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05,
            color: text, maxWidth: isMobile ? 300 : 620,
          }}>
            One plan. <span style={{ color: '#A07850' }}>Everything</span> unlocked.
          </h1>
          <p style={{
            marginTop: isMobile ? 12 : 16,
            fontSize: isMobile ? '0.9rem' : '1.02rem',
            lineHeight: 1.6, color: sub,
            maxWidth: isMobile ? 300 : 440,
            marginLeft: 'auto', marginRight: 'auto',
          }}>
            No tiers to compare, no features held hostage.{' '}
            {!isMobile && <br />}
            Just the full Palm experience ready the moment you are.
          </p>
        </motion.div>

        {/* ── Card ────────────────────────────────────────────────────────── */}
        <motion.div
          onMouseMove={onCardMove}
          onMouseLeave={onCardLeave}
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE_OUT_EXPO, delay: 0.15 }}
          style={{
            position: 'relative', width: '100%',
            maxWidth: isMobile ? '100%' : 460,
            // Lock springs to 0 on touch — no pointer parallax
            rotateX: isMobile ? 0 : rotX,
            rotateY: isMobile ? 0 : rotY,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Glow ring */}
          <motion.div
            animate={{ opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', inset: -1,
              borderRadius: isMobile ? 24 : 30,
              background: 'linear-gradient(135deg, rgba(160,120,80,0.45), transparent 40%, transparent 60%, rgba(160,120,80,0.35))',
              filter: `blur(18px) url(#pricing-glass-${isLight ? 'light' : 'dark'})`,
              zIndex: -1,
            }}
          />

          <div style={{
            position: 'relative',
            borderRadius: isMobile ? 24 : 28,
            overflow: 'hidden',
            background: isLight ? 'rgba(245,240,232,0.62)' : 'rgba(12,12,12,0.62)',
            backdropFilter: 'blur(30px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(30px) saturate(1.5)',
            border: isLight ? '1px solid rgba(255,255,255,0.75)' : '1px solid rgba(255,255,255,0.10)',
            boxShadow: isLight
              ? '0 12px 50px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.85)'
              : '0 24px 90px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
            padding: isMobile ? '28px 20px' : '40px 36px',
          }}>
            {/* Top edge highlight */}
            <div style={{
              position: 'absolute', top: 0, left: '12%', right: '12%', height: 1,
              background: isLight
                ? 'linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)'
                : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)',
            }} />

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, ...SPRING_SNAPPY }}
              style={{ display: 'flex', justifyContent: 'center', marginBottom: isMobile ? 14 : 18 }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: isMobile ? '5px 12px' : '6px 14px',
                borderRadius: 9999,
                background: 'rgba(160,120,80,0.16)',
                border: '1px solid rgba(160,120,80,0.30)',
                fontSize: isMobile ? 10 : 11, fontWeight: 600,
                letterSpacing: '0.04em', textTransform: 'uppercase', color: '#A07850',
              }}>
                <Sparkles size={isMobile ? 11 : 12} />
                Most popular
              </div>
            </motion.div>

            {/* Plan name + price */}
            <div style={{ textAlign: 'center', marginBottom: isMobile ? 20 : 28 }}>
              <h2 style={{
                margin: 0, fontSize: isMobile ? '1.1rem' : '1.3rem',
                fontWeight: 700, letterSpacing: '-0.025em', color: text,
              }}>
                Palm Pro
              </h2>
              <div style={{
                marginTop: isMobile ? 10 : 14, display: 'flex',
                alignItems: 'baseline', justifyContent: 'center', gap: 6,
              }}>
                <span style={{
                  fontSize: isMobile ? 'clamp(2.4rem, 12vw, 3.2rem)' : 'clamp(3rem, 8vw, 4rem)',
                  fontWeight: 800, letterSpacing: '-0.04em',
                }}>
                  <AnimatedPrice value="$20" isLight={isLight} />
                </span>
                <span style={{ fontSize: isMobile ? 13 : 15, fontWeight: 500, color: sub }}>/month</span>
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                style={{
                  marginTop: isMobile ? 8 : 10,
                  fontSize: isMobile ? 12.5 : 13.5,
                  lineHeight: 1.6, color: sub,
                  maxWidth: isMobile ? 260 : 320,
                  marginLeft: 'auto', marginRight: 'auto',
                }}
              >
                10 credits every month. Each credit unlocks a full AI-powered task —
                built for freelancers and creators who ship.
              </motion.p>
            </div>

            {/* Divider */}
            <div style={{
              height: 1, margin: '0 0 20px',
              background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)',
            }} />

            {/* Features */}
            <div style={{ display: 'grid', gap: isMobile ? 6 : 8 }}>
              {FEATURES.map((f, i) => (
                <FeatureRow
                  key={f.title} {...f}
                  isLight={isLight} isMobile={isMobile}
                  delay={0.5 + i * 0.06}
                />
              ))}
            </div>

            {/* CTA — SubscribeButton owns its own styling; we control the wrapper */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.6, ease: EASE_OUT_EXPO }}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              style={{ marginTop: isMobile ? 20 : 28 }}
            >
              <SubscribeButton />
            </motion.div>

            <p style={{
              marginTop: 12, textAlign: 'center',
              fontSize: isMobile ? 11 : 11.5,
              color: isLight ? 'rgba(0,0,0,0.32)' : 'rgba(255,255,255,0.30)',
            }}>
              Cancel anytime · no questions asked
            </p>
          </div>
        </motion.div>

        <TrustStrip isLight={isLight} isMobile={isMobile} />

        {/* Legal links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          style={{ marginTop: isMobile ? 24 : 36, textAlign: 'center' }}
        >
          <div style={{
            display: 'flex', justifyContent: 'center',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            gap: isMobile ? 8 : 16,
            fontSize: isMobile ? 11 : 11.5,
          }}>
            {[
              { label: 'Terms of Service', href: '/terms' },
              { label: 'Privacy Policy',   href: '/privacy' },
              { label: 'Contact Support',  href: 'mailto:support@palm.app' },
            ].map((l, i) => (
              <span key={l.href} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <a href={l.href} style={{ color: sub, textDecoration: 'underline', textUnderlineOffset: 4 }}>
                  {l.label}
                </a>
                {/* Pipe separators only render in row layout */}
                {!isMobile && i < 2 && (
                  <span style={{ color: isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)' }}>|</span>
                )}
              </span>
            ))}
          </div>
          <p style={{
            marginTop: 10,
            fontSize: isMobile ? 10 : 10.5,
            color: isLight ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.24)',
            maxWidth: isMobile ? 280 : undefined,
            marginLeft: 'auto', marginRight: 'auto',
          }}>
            Payments are securely processed. By subscribing, you agree to our terms and billing policy.
          </p>
        </motion.div>
      </div>

      {/* GlassTooltip wraps the fixed toggle on desktop only.
          On mobile the toggle already lives in the top bar, so we hide this. */}
      {!isMobile && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50 }}>
          <GlassTooltip content="Toggle theme" side="left">
            <ThemeToggle />
          </GlassTooltip>
        </div>
      )}
    </div>
  )
}