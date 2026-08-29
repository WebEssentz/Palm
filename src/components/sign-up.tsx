'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useAuthActions } from '@convex-dev/auth/react'
import { useAuth } from '@/hooks/use-auth'
import { ThemeToggle } from '@/components/theme/toggle'

// ─── Auth Dot Background ───────────────────────────────────────────────────────
function AuthBackground({ isLight }: { isLight: boolean }) {
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
      const dotColor = isLight ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,1)'

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const ox = col * SPACING - SPACING
          const oy = row * SPACING - SPACING
          const dx = ox - mx
          const dy = oy - my
          const dist = Math.sqrt(dx * dx + dy * dy)

          let wx = ox, wy = oy, alpha = 0.14

          if (dist < RADIUS && dist > 0) {
            const t     = 1 - dist / RADIUS
            const shove = t * t * PUSH
            wx = ox + (dx / dist) * shove
            wy = oy + (dy / dist) * shove
            alpha = dist < RADIUS * 0.3
              ? 0
              : 0.5 * ((dist - RADIUS * 0.3) / (RADIUS * 0.7))
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
      mouse.current = { x: -9999, y: -9999 }
      smoothMouse.current = { x: -9999, y: -9999 }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    const ro = new ResizeObserver(init)
    ro.observe(canvas)
    init(); draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
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

// ─── Login Page ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { theme, systemTheme } = useTheme()
  const { signIn }  = useAuthActions()
  const pathname    = usePathname()
  const [mounted, setMounted]     = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [flow, setFlow] = useState<'signIn' | 'signUp'>(
    pathname.includes('sign-up') ? 'signUp' : 'signIn'
  )

  useEffect(() => setMounted(true), [])

  const { signInForm, signUpForm, handleSignIn, handleSignUp, isLoading } = useAuth()
  const { register: rIn,  handleSubmit: hIn,  formState: { errors: eIn  } } = signInForm
  const { register: rUp,  handleSubmit: hUp,  formState: { errors: eUp  } } = signUpForm

  if (!mounted) return null

  const isLight = (theme === 'system' ? systemTheme : theme) === 'light'
  const bg      = isLight ? '#ffffff' : '#0a0a0a'
  const text    = isLight ? '#0a0a0a' : '#ffffff'
  const muted   = isLight ? 'rgba(0,0,0,0.36)' : 'rgba(255,255,255,0.36)'
  const line    = isLight ? 'rgba(0,0,0,0.08)'  : 'rgba(255,255,255,0.08)'

  // Bottom-border-only input — the rare choice
  const field: React.CSSProperties = {
    width: '100%', padding: '14px 0',
    background: 'none', border: 'none',
    borderBottom: `1px solid ${line}`,
    outline: 'none', fontSize: 15,
    color: text, letterSpacing: '-0.012em',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  const err = (msg?: string) => msg
    ? <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 8px' }}>{msg}</p>
    : null

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: bg, display: 'flex', overflow: 'hidden' }}>
      <AuthBackground isLight={isLight} />

      {/* ── LEFT — expressive, editorial ── */}
      <div className="hidden md:flex" style={{
        flex: 1, flexDirection: 'column', justifyContent: 'center',
        padding: '0 72px', position: 'relative', zIndex: 1,
      }}>

        {/* Logo */}
        <Link href="/" style={{ position: 'absolute', top: 36, left: 48, display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: bg }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: text, letterSpacing: '-0.01em' }}>Palm</span>
        </Link>

        {/* Editorial headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: muted, margin: '0 0 24px' }}>
            {flow === 'signUp' ? 'Get started free' : 'Welcome back'}
          </p>
          <h1 style={{
            fontSize: 'clamp(3.2rem, 6vw, 5.8rem)',
            fontWeight: 800, letterSpacing: '-0.044em',
            lineHeight: 0.96, color: text, margin: 0,
          }}>
            Turn ideas<br />into inter-<br />faces.
          </h1>
          <p style={{
            fontSize: '1rem', color: muted,
            margin: '28px 0 0', lineHeight: 1.7,
            letterSpacing: '-0.01em', maxWidth: 300,
          }}>
            The fastest way from idea to something you can actually show people.
          </p>
        </motion.div>

        {/* Floating year stamp */}
        <p style={{
          position: 'absolute', bottom: 36, left: 48,
          fontSize: 11, color: muted, letterSpacing: '0.04em',
          margin: 0,
        }}>
          © {new Date().getFullYear()} Palm
        </p>
      </div>

      {/* Hairline — the only structural divider */}
      <div className="hidden md:block" style={{
        width: 1, background: line,
        alignSelf: 'stretch', margin: '56px 0', flexShrink: 0,
        position: 'relative', zIndex: 1,
      }} />

      {/* ── RIGHT — surgical, silent ── */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        style={{
          width: '100%', maxWidth: 420, flexShrink: 0,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '80px 52px', position: 'relative', zIndex: 1,
          minHeight: '100dvh', boxSizing: 'border-box',
        }}
      >
        {/* Mobile logo */}
        <Link href="/" className="flex md:hidden" style={{ alignItems: 'center', gap: 8, marginBottom: 48, textDecoration: 'none' }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: bg }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: text }}>Palm</span>
        </Link>

        <h2 style={{ fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.028em', color: text, margin: '0 0 6px' }}>
          {flow === 'signUp' ? 'Create account' : 'Sign in'}
        </h2>
        <p style={{ fontSize: 13, color: muted, margin: '0 0 40px', letterSpacing: '-0.01em' }}>
          {flow === 'signUp' ? 'No credit card required.' : 'Good to have you back.'}
        </p>

        {/* Google */}
        <button
          onClick={() => signIn('google')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '13px 20px', borderRadius: 12,
            background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${line}`,
            color: text, fontSize: 14, fontWeight: 500,
            letterSpacing: '-0.01em', cursor: 'pointer',
            transition: 'background 0.15s', marginBottom: 28,
          }}
          onMouseEnter={e => e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 262" style={{ flexShrink: 0 }}>
            <path fill="#4285f4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"/>
            <path fill="#34a853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"/>
            <path fill="#fbbc05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73-40.711-31.607-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"/>
            <path fill="#eb4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ flex: 1, height: 1, background: line }} />
          <span style={{ fontSize: 11, color: muted, letterSpacing: '0.06em' }}>or</span>
          <div style={{ flex: 1, height: 1, background: line }} />
        </div>

        {/* Email */}
        <AnimatePresence mode="wait">
          {!showEmail ? (
            <motion.button
              key="trigger"
              initial={{ opacity: 1 }} exit={{ opacity: 0 }}
              type="button" onClick={() => setShowEmail(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, color: muted, letterSpacing: '-0.01em',
                padding: '4px 0', textAlign: 'left', transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = text}
              onMouseLeave={e => e.currentTarget.style.color = muted as string}
            >
              Continue with email →
            </motion.button>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={flow === 'signIn' ? hIn(handleSignIn) : hUp(handleSignUp)}
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              <AnimatePresence>
                {flow === 'signUp' && (
                  <motion.div
                    key="names"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{ display: 'flex', gap: 20, overflow: 'hidden' }}
                  >
                    <div style={{ flex: 1 }}>
                      <input {...rUp('firstName')} placeholder="First name" autoFocus style={field} />
                      {err(eUp.firstName?.message)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input {...rUp('lastName')} placeholder="Last name" style={field} />
                      {err(eUp.lastName?.message)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <input
                {...(flow === 'signIn' ? rIn('email') : rUp('email'))}
                type="email" placeholder="Email"
                autoFocus={flow === 'signIn'} style={field}
              />
              {err((flow === 'signIn' ? eIn.email : eUp.email)?.message)}

              <input
                {...(flow === 'signIn' ? rIn('password') : rUp('password'))}
                type="password" placeholder="Password"
                style={{ ...field, marginBottom: 28 }}
              />
              {err((flow === 'signIn' ? eIn.password : eUp.password)?.message)}

              <button
                type="submit" disabled={isLoading}
                style={{
                  width: '100%', padding: '13px 20px', borderRadius: 12,
                  background: text, color: bg,
                  fontSize: 14, fontWeight: 600, letterSpacing: '-0.012em',
                  border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1, transition: 'opacity 0.15s',
                }}
              >
                {isLoading ? 'Please wait…' : flow === 'signIn' ? 'Sign in' : 'Create account'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Switch flow */}
        <p style={{ fontSize: 12, color: muted, margin: '36px 0 0', letterSpacing: '-0.01em' }}>
          {flow === 'signUp' ? 'Already have an account? ' : "Don't have an account? "}
          <Link
            href={flow === 'signUp' ? '/auth/sign-in' : '/auth/sign-up'}
            style={{ color: text, fontWeight: 500, textDecoration: 'none' }}
            onClick={() => { setFlow(flow === 'signUp' ? 'signIn' : 'signUp'); setShowEmail(false) }}
          >
            {flow === 'signUp' ? 'Sign in' : 'Sign up'}
          </Link>
        </p>

        <p style={{ fontSize: 11, color: muted, margin: '10px 0 0', letterSpacing: '-0.01em', opacity: 0.65 }}>
          By continuing you agree to our{' '}
          <Link href="#" style={{ color: text, textDecoration: 'underline', textUnderlineOffset: 2 }}>Terms</Link>
          {' '}and{' '}
          <Link href="#" style={{ color: text, textDecoration: 'underline', textUnderlineOffset: 2 }}>Privacy</Link>
        </p>

        {/* Theme toggle */}
        <div style={{ position: 'absolute', bottom: 24, right: 24, zIndex: 50 }}>
          <ThemeToggle />
        </div>
      </motion.div>
    </div>
  )
}