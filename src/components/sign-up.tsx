'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useAuthActions } from '@convex-dev/auth/react'
import ParticleBackground from '@/components/home/particle-background'
import { CyclingWord } from '@/components/home/cyclic-word'
import { ThemeToggle } from '@/components/theme/toggle'
import { GlassTooltip } from '@/components/ui/glass-tooltip'
import { useAuth } from '@/hooks/use-auth'

const inputStyle = (isLight: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.065)',
  border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.13)',
  outline: 'none',
  fontSize: '14px',
  color: isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)',
  letterSpacing: '-0.012em',
  boxSizing: 'border-box',
})

const errorStyle = (isLight: boolean): React.CSSProperties => ({
  marginTop: '4px',
  fontSize: '11px',
  color: isLight ? 'rgba(200,40,40,0.85)' : 'rgba(255,100,100,0.75)',
  letterSpacing: '-0.01em',
})

const getGlassButtonBase = (isLight: boolean): React.CSSProperties => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '11px',
  padding: '15px 20px',
  borderRadius: '14px',
  background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.11)',
  boxShadow: isLight
    ? [
        '0 0 0 0.5px rgba(0,0,0,0.04)',
        '0 2px 8px rgba(0,0,0,0.06)',
        '0 10px 36px rgba(0,0,0,0.08)',
        'inset 0 1px 0 rgba(255,255,255,0.50)',
        'inset 0 -1px 0 rgba(0,0,0,0.05)',
      ].join(', ')
    : [
        '0 0 0 0.5px rgba(255,255,255,0.04)',
        '0 2px 8px rgba(0,0,0,0.35)',
        '0 10px 36px rgba(0,0,0,0.22)',
        'inset 0 1px 0 rgba(255,255,255,0.10)',
        'inset 0 -1px 0 rgba(0,0,0,0.20)',
      ].join(', '),
  color: isLight ? 'rgba(0,0,0,0.78)' : 'rgba(255,255,255,0.88)',
  fontSize: '15px',
  fontWeight: 500,
  letterSpacing: '-0.012em',
  cursor: 'pointer',
  transition: 'background 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease',
  position: 'relative',
  overflow: 'hidden',
})

function GlassOAuthButton({
  icon,
  label,
  onClick,
  isLight,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  isLight: boolean
}) {
  const glassButtonBase = getGlassButtonBase(isLight)
  return (
    <button
      type="button"
      onClick={onClick}
      style={glassButtonBase}
      onMouseEnter={e => {
        const el = e.currentTarget
        if (isLight) {
          el.style.background = 'rgba(0,0,0,0.10)'
          el.style.boxShadow = [
            '0 0 0 0.5px rgba(0,0,0,0.08)',
            '0 4px 14px rgba(0,0,0,0.10)',
            '0 14px 44px rgba(0,0,0,0.12)',
            'inset 0 1px 0 rgba(255,255,255,0.60)',
            'inset 0 -1px 0 rgba(0,0,0,0.08)',
          ].join(', ')
        } else {
          el.style.background = 'rgba(255,255,255,0.11)'
          el.style.boxShadow = [
            '0 0 0 0.5px rgba(255,255,255,0.06)',
            '0 4px 14px rgba(0,0,0,0.38)',
            '0 14px 44px rgba(0,0,0,0.26)',
            'inset 0 1px 0 rgba(255,255,255,0.14)',
            'inset 0 -1px 0 rgba(0,0,0,0.20)',
          ].join(', ')
        }
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.background = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)'
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = glassButtonBase.boxShadow as string
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'translateY(0) scale(0.985)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-1px) scale(1)' }}
    >
      {/* Specular streak */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: '8%',
          right: '8%',
          height: '1px',
          borderRadius: '9999px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
          pointerEvents: 'none',
        }}
      />
      {icon}
      {label}
    </button>
  )
}

export default function LoginPage() {
  const { theme, systemTheme } = useTheme()
  const { signIn } = useAuthActions()
  const pathname = usePathname()
  const router = useRouter()
  const [showEmail, setShowEmail] = useState(false)
  const [flow, setFlow] = useState<'signIn' | 'signUp'>(
    pathname.includes('sign-up') ? 'signUp' : 'signIn'
  )

  const { signInForm, signUpForm, handleSignIn, handleSignUp, isLoading } = useAuth()

  const {
    register: registerSignIn,
    handleSubmit: handleSignInSubmit,
    formState: { errors: signInErrors },
  } = signInForm

  const {
    register: registerSignUp,
    handleSubmit: handleSignUpSubmit,
    formState: { errors: signUpErrors },
  } = signUpForm
  
  const effectiveTheme = theme === 'system' ? systemTheme : theme
  const isLightMode = effectiveTheme === 'light'

  return (
    <div
      className="relative flex min-h-screen overflow-hidden"
      style={{ background: isLightMode ? '#F5F0E8' : '#070707' }}
    >
      {/* SVG liquid glass filters */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <defs>
          <filter id="login-glass" x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.65 0.42" numOctaves="3" seed="12" result="noise">
              <animate attributeName="baseFrequency" values="0.65 0.42;0.68 0.45;0.65 0.42" dur="8s" repeatCount="indefinite" />
            </feTurbulence>
            <feGaussianBlur in="noise" stdDeviation="1.4" result="blurNoise" />
            <feDisplacementMap in="SourceGraphic" in2="blurNoise" scale="11" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feComposite in="displaced" in2="SourceGraphic" operator="atop" />
          </filter>
          <filter id="login-glass-light" x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.65 0.42" numOctaves="3" seed="12" result="noise">
              <animate attributeName="baseFrequency" values="0.65 0.42;0.68 0.45;0.65 0.42" dur="8s" repeatCount="indefinite" />
            </feTurbulence>
            <feGaussianBlur in="noise" stdDeviation="1.4" result="blurNoise" />
            <feDisplacementMap in="SourceGraphic" in2="blurNoise" scale="11" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feComposite in="displaced" in2="SourceGraphic" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Full-page particles — visible on all screen sizes */}
      <ParticleBackground />

      {/* ── LEFT SIDE — cinematic, particles, glass headline ── */}
      <div className="relative hidden md:flex flex-col items-center justify-center flex-1 px-16 overflow-hidden">

        {/* Logo — top left */}
        <div className="absolute top-8 left-8 z-10 flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-primary-foreground" />
          </div>
          <span
            className="text-sm font-semibold"
            style={{ color: isLightMode ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.55)', letterSpacing: '-0.01em' }}
          >
            Palm
          </span>
        </div>

        {/* Hero */}
        <div className="relative z-10 text-center max-w-2xl select-none">
          <h1
            className="font-display font-bold text-white leading-[1.06]"
            style={{
              fontSize: 'clamp(2.8rem, 4.8vw, 4rem)',
              letterSpacing: '-0.03em',
            }}
          >
            <CyclingWord />
          </h1>
          <p
            className="mt-5 font-light tracking-wide"
            style={{ fontSize: '1rem', color: isLightMode ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.28)', letterSpacing: '0.02em' }}
          >
            Turn ideas into interfaces, instantly.
          </p>
        </div>
      </div>

      {/* Vertical divider */}
      <div
        className="hidden md:block self-stretch my-14 flex-shrink-0"
        style={{
          width: '1px',
          background: isLightMode
            ? 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.06) 18%, rgba(0,0,0,0.06) 82%, transparent 100%)'
            : 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.07) 18%, rgba(255,255,255,0.07) 82%, transparent 100%)',
        }}
      />

      {/* ── RIGHT SIDE — floating, no card ── */}
      <div
        className="relative z-10 flex flex-col justify-center w-full md:w-[400px] lg:w-[440px] flex-shrink-0 px-8 md:px-12 lg:px-14"
        style={{ minHeight: '100dvh' }}
      >
        {/* Mobile: logo + heading */}
        <div className="md:hidden mb-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div
              className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-primary-foreground" />
            </div>
            <span className="text-sm font-semibold" style={{ color: isLightMode ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.55)' }}>
              Palm
            </span>
          </div>
          <h1
            className="font-display font-bold"
            style={{ 
              color: isLightMode ? '#000' : '#fff',
              fontSize: '2rem', 
              letterSpacing: '-0.03em', 
              lineHeight: 1.1 
            }}
          >
            <CyclingWord />
          </h1>
        </div>

        {/* Eyebrow + heading */}
        <p
          className="hidden md:block text-xs font-medium uppercase mb-2.5"
          style={{ letterSpacing: '0.12em', color: isLightMode ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.22)' }}
        >
          {flow === 'signUp' ? 'Get started' : 'Welcome back'}
        </p>
        <h2
          className="hidden md:block font-bold mb-8"
          style={{ 
            color: isLightMode ? '#000' : '#fff',
            fontSize: '1.7rem', 
            letterSpacing: '-0.025em', 
            lineHeight: 1.14 
          }}
        >
          {flow === 'signUp' ? 'Create your account' : 'Sign in to Palm'}
        </h2>

        {/* OAuth buttons */}
        <div className="flex flex-col gap-3 w-full">
          <GlassOAuthButton
            isLight={isLightMode}
            label="Continue with Google"
            onClick={() => signIn("google")}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 262" style={{ flexShrink: 0 }}>
                <path fill="#4285f4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" />
                <path fill="#34a853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" />
                <path fill="#fbbc05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73-40.711-31.607-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z" />
                <path fill="#eb4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" />
              </svg>
            }
          />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1" style={{ height: '0.5px', background: isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: '11px', color: isLightMode ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.22)', letterSpacing: '0.06em' }}>or</span>
          <div className="flex-1" style={{ height: '0.5px', background: isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Email fallback / multi-field form */}
        <AnimatePresence mode="wait">
          {!showEmail ? (
            <motion.button
              key="email-cta"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              type="button"
              onClick={() => setShowEmail(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                color: isLightMode ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.32)',
                letterSpacing: '-0.01em',
                padding: '4px 0',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = isLightMode ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.58)' }}
              onMouseLeave={e => { e.currentTarget.style.color = isLightMode ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.32)' }}
            >
              Continue with email
            </motion.button>
          ) : (
            <motion.form
              key="email-form"
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onSubmit={
                flow === 'signIn'
                  ? handleSignInSubmit(handleSignIn)
                  : handleSignUpSubmit(handleSignUp)
              }
              style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}
            >
              {/* Name fields — sign-up only */}
              <AnimatePresence>
                {flow === 'signUp' && (
                  <motion.div
                    key="name-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    style={{ display: 'flex', gap: '8px', overflow: 'hidden' }}
                  >
                    <div style={{ flex: 1 }}>
                      <input
                        {...registerSignUp('firstName')}
                        placeholder="First name"
                        autoFocus
                        style={inputStyle(isLightMode)}
                      />
                      {signUpErrors.firstName && (
                        <p style={errorStyle(isLightMode)}>{signUpErrors.firstName.message}</p>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        {...registerSignUp('lastName')}
                        placeholder="Last name"
                        style={inputStyle(isLightMode)}
                      />
                      {signUpErrors.lastName && (
                        <p style={errorStyle(isLightMode)}>{signUpErrors.lastName.message}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div>
                <input
                  {...(flow === 'signIn' ? registerSignIn('email') : registerSignUp('email'))}
                  type="email"
                  placeholder="your@email.com"
                  autoFocus={flow === 'signIn'}
                  style={inputStyle(isLightMode)}
                />
                {(flow === 'signIn' ? signInErrors.email : signUpErrors.email) && (
                  <p style={errorStyle(isLightMode)}>
                    {(flow === 'signIn' ? signInErrors.email : signUpErrors.email)?.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <input
                  {...(flow === 'signIn' ? registerSignIn('password') : registerSignUp('password'))}
                  type="password"
                  placeholder="Password"
                  style={inputStyle(isLightMode)}
                />
                {(flow === 'signIn' ? signInErrors.password : signUpErrors.password) && (
                  <p style={errorStyle(isLightMode)}>
                    {(flow === 'signIn' ? signInErrors.password : signUpErrors.password)?.message}
                  </p>
                )}
                {/* sign-up root error (e.g. "Email already exists") */}
                {flow === 'signUp' && signUpErrors.root && (
                  <p style={errorStyle(isLightMode)}>{signUpErrors.root.message}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  ...getGlassButtonBase(isLightMode),
                  background: isLightMode ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.90)',
                  color: isLightMode ? '#fff' : '#070707',
                  opacity: isLoading ? 0.6 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading
                  ? 'Please wait…'
                  : flow === 'signIn' ? 'Sign in' : 'Create account'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Footer links */}
        {!showEmail && (
          <p
            className="mt-10 text-center"
            style={{ fontSize: '12px', color: isLightMode ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.22)', letterSpacing: '-0.01em' }}
          >
            {flow === 'signUp' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <Link
              href={flow === 'signUp' ? '/auth/sign-in' : '/auth/sign-up'}
              style={{ color: isLightMode ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.42)', transition: 'color 0.15s' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = isLightMode ? 'rgba(0,0,0,0.78)' : 'rgba(255,255,255,0.65)' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = isLightMode ? 'rgba(14, 13, 13, 0.55)' : 'rgba(255,255,255,0.42)' }}
            >
              {flow === 'signUp' ? 'Sign in' : 'Sign up'}
            </Link>
          </p>
        )}
        <p
          className="mt-2.5 text-center"
          style={{ fontSize: '11px', color: isLightMode ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.14)', letterSpacing: '-0.01em' }}
        >
          By continuing you agree to our{' '}
          <Link href="#" style={{ color: isLightMode ? 'rgba(0,0,0,0.50)' : 'rgba(255,255,255,0.28)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            Terms
          </Link>
          {' '}and{' '}
          <Link href="#" style={{ color: isLightMode ? 'rgba(0,0,0,0.50)' : 'rgba(255,255,255,0.28)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            Privacy Policy
          </Link>
        </p>

        {/* Theme toggle — bottom right */}
        <div className="absolute bottom-6 right-6 z-50">
          <GlassTooltip content="Toggle theme" side="left">
            <ThemeToggle />
          </GlassTooltip>
        </div>
      </div>
    </div>
  )
}