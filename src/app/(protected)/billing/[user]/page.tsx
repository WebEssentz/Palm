'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useConvexAuth, useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../../../../convex/_generated/api'
import { useRouter } from 'next/navigation'
import {
  Palette, Layers, ImagePlus, Move, Magnet, MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import SubscribeButton from '@/components/buttons/checkout'
import { ThemeToggle } from '@/components/theme/toggle'
import { GlassTooltip } from '@/components/ui/glass-tooltip'
import ParticleBackground from '@/components/home/dot-particle-background'
import Loading from '@/app/(protected)/dashboard/loading'
import { useIsMobile } from '@/hooks/use-mobile'

const EX = [0.16, 1, 0.3, 1] as const

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Palette,       title: 'AI design generation',     body: 'Generate polished UI from a single prompt.' },
  { icon: Layers,        title: 'Smart style guides',        body: 'Auto-generate typography, color, and brand rules.' },
  { icon: ImagePlus,     title: 'Mood board creation',       body: 'Curate visual inspiration for every project.' },
  { icon: Move,          title: 'Infinite canvas',           body: 'Sketch and arrange ideas on a boundless canvas.' },
  { icon: Magnet,        title: 'Snap & alignment',          body: 'Pixel-perfect layouts with intelligent snapping.' },
  { icon: MessageSquare, title: 'AI design assistant',       body: 'Real-time feedback and suggestions as you design.' },
]

// ─── Root ─────────────────────────────────────────────────────────────────────
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
    if (!isLoading && !isAuthenticated) { router.replace('/'); return }
    if (!isLoading && isAuthenticated && currentUser === null) {
      signOut().then(() => router.replace('/'))
    }
  }, [isLoading, isAuthenticated, currentUser, router, signOut])

  const isMobile = useIsMobile()

  if (!mounted || isLoading) return <Loading />
  if (!isAuthenticated || currentUser === null) return null

  const isLight = (theme === 'system' ? systemTheme : theme) === 'light'
  const bg      = isLight ? '#ffffff' : '#0a0a0a'
  const text    = isLight ? '#0a0a0a' : '#ffffff'
  const muted   = isLight ? 'rgba(0,0,0,0.44)' : 'rgba(255,255,255,0.44)'
  const line    = isLight ? 'rgba(0,0,0,0.08)'  : 'rgba(255,255,255,0.07)'
  const cardBg  = isLight ? 'rgba(0,0,0,0.02)'  : 'rgba(255,255,255,0.03)'

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: bg, overflow: 'hidden' }}>
      <ParticleBackground isLight={isLight} />

      {/* Nav */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '18px 20px' : '18px 48px',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: bg }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: text }}>Palm</span>
        </Link>
      </div>

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 10,
        minHeight: '100dvh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? '100px 20px 60px' : '120px 48px 80px',
      }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EX }}
          style={{ textAlign: 'center', marginBottom: isMobile ? 48 : 72 }}
        >
          <p style={{
            fontSize: 11, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: muted, margin: '0 0 16px',
          }}>Pricing</p>
          <h1 style={{
            fontSize: isMobile ? 'clamp(2rem, 8vw, 2.8rem)' : 'clamp(2.8rem, 5vw, 4.2rem)',
            fontWeight: 700, letterSpacing: '-0.038em',
            lineHeight: 1.06, color: text, margin: '0 0 16px',
          }}>
            One plan.<br />Everything unlocked.
          </h1>
        </motion.div>

        {/* Card */}
        <div
          className={`palm-card-wrapper${isLight ? ' is-light' : ''}`}
          style={{ position: 'relative', padding: '1px', borderRadius: 25, width: '100%', maxWidth: isMobile ? '100%' : 880 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EX, delay: 0.15 }}
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 0,
            border: `1px solid transparent`,
            borderRadius: isMobile ? 20 : 24,
            overflow: 'hidden',
            background: isLight ? '#ffffff' : '#111111',
            backdropFilter: 'blur(20px)',
            }}
          >
          {/* Left — price */}
          <div style={{
            padding: isMobile ? '36px 28px' : '52px 48px',
            borderRight: isMobile ? 'none' : `1px solid ${line}`,
            borderBottom: isMobile ? `1px solid ${line}` : 'none',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: muted, margin: '0 0 28px' }}>
                Palm Pro
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
                <span style={{
                  fontSize: isMobile ? 'clamp(3rem, 14vw, 4.5rem)' : 'clamp(3.5rem, 7vw, 5.5rem)',
                  fontWeight: 800, letterSpacing: '-0.045em', color: text, lineHeight: 1,
                }}>$20</span>
                <span style={{ fontSize: 15, fontWeight: 500, color: muted }}>/month</span>
              </div>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: muted, margin: '0 0 36px', maxWidth: 280 }}>
                500 credits every month. Each credit powers a build or edit — made for founders and creators who ship.
              </p>
            </div>

            {/* CTA */}
            <div>
              <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
                <SubscribeButton />
              </motion.div>
              <p style={{ fontSize: 12, color: muted, margin: '14px 0 0', letterSpacing: '-0.01em' }}>
                Cancel anytime
              </p>
            </div>
          </div>

          {/* Right — features */}
          <div style={{ padding: isMobile ? '36px 28px' : '52px 48px' }}>
            <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: muted, margin: '0 0 24px' }}>
              What's included
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: EX, delay: 0.4 + i * 0.07 }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '16px 0',
                    borderBottom: i < FEATURES.length - 1 ? `1px solid ${line}` : 'none',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    border: `1px solid ${line}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: 1,
                  }}>
                    <f.icon size={13} color={muted} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.012em', color: text }}>
                      {f.title}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, lineHeight: 1.55, color: muted }}>
                      {f.body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          </motion.div>
        </div>

        {/* Legal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          style={{ marginTop: 40, textAlign: 'center' }}
        >
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 8 : 20,
            fontSize: 11.5, color: muted,
          }}>
            {[
              { label: 'Terms of Service', href: '/terms' },
              { label: 'Privacy Policy',   href: '/privacy' },
              { label: 'Contact Support',  href: 'mailto:support@palm.app' },
            ].map((l, i) => (
              <span key={l.href} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <a href={l.href} style={{ color: muted, textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = text)}
                  onMouseLeave={e => (e.currentTarget.style.color = muted)}
                >{l.label}</a>
                {!isMobile && i < 2 && (
                  <span style={{ color: line }}>·</span>
                )}
              </span>
            ))}
          </div>
          <p style={{ marginTop: 10, fontSize: 11, color: isLight ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.22)' }}>
            Payments securely processed. By subscribing you agree to our terms and billing policy.
          </p>
        </motion.div>
      </div>

      {!isMobile && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50 }}>
          <GlassTooltip content="Toggle theme" side="left">
            <ThemeToggle />
          </GlassTooltip>
        </div>
      )}
      <style>{`
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        .palm-card-wrapper::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 25px;
          background: conic-gradient(
            from var(--angle),
            transparent 0%,
            transparent 65%,
            rgba(255,255,255,0.04) 75%,
            rgba(255,255,255,0.4) 88%,
            rgba(255,255,255,0.95) 97%,
            transparent 100%
          );
          animation: circuit 4s linear infinite;
          z-index: 0;
        }
        .palm-card-wrapper.is-light::before {
          background: conic-gradient(
            from var(--angle),
            transparent 0%,
            transparent 65%,
            rgba(0,0,0,0.03) 75%,
            rgba(0,0,0,0.25) 88%,
            rgba(0,0,0,0.7) 97%,
            transparent 100%
          );
        }
        @keyframes circuit { to { --angle: 360deg; } }
      `}</style>
    </div>
  )
}