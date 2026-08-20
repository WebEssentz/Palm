'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useTheme } from 'next-themes'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { combinedSlug } from '@/lib/utils'

export function AvatarDropdown({ creditBalance }: { creditBalance?: number }) {
  const { theme, systemTheme } = useTheme()
  const me = useQuery(api.user.getCurrentUser)
  const userSlug = combinedSlug(me?.name ?? '', me?._id)
  const { signOut } = useAuthActions()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isLight = (theme === 'system' ? systemTheme : theme) === 'light'
  const bg     = isLight ? '#ffffff' : '#141414'
  const text   = isLight ? '#0a0a0a' : '#ffffff'
  const muted  = isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.38)'
  const border = isLight ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.09)'
  const hoverBg = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)'

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/sign-in')
  }

  const row = (
    label: string,
    onClick: () => void,
    right?: React.ReactNode,
    destructive?: boolean,
  ) => (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, padding: '8px 12px', borderRadius: 8, border: 'none',
        background: 'transparent', cursor: 'pointer',
        fontSize: 13, color: destructive ? '#ef4444' : text,
        letterSpacing: '-0.012em', transition: 'background 0.12s',
        textAlign: 'left',
      }}
      onMouseEnter={e => e.currentTarget.style.background = destructive ? 'rgba(239,68,68,0.06)' : hoverBg}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span>{label}</span>
      {right && <span style={{ fontSize: 11, color: muted }}>{right}</span>}
    </button>
  )

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>

      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
      >
        <Avatar className="size-8">
          <AvatarImage src={me?.image || ''} />
          <AvatarFallback style={{ background: text, color: bg, fontSize: 12, fontWeight: 700 }}>
            {me?.name?.[0]?.toUpperCase() ?? '?'}
          </AvatarFallback>
        </Avatar>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 42, zIndex: 100,
          width: 220, borderRadius: 14,
          background: bg,
          border: `1px solid ${border}`,
          boxShadow: isLight
            ? '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)'
            : '0 4px 24px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          animation: 'dropIn 0.18s ease',
        }}>

          {/* Profile header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px 12px' }}>
            <Avatar style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }}>
              <AvatarImage src={me?.image || ''} />
              <AvatarFallback style={{
                background: text, color: bg,
                fontSize: 13, fontWeight: 700, borderRadius: 10,
              }}>
                {me?.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: text, margin: 0, letterSpacing: '-0.012em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {me?.name}
              </p>
              <p style={{ fontSize: 11, color: muted, margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {me?.email}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: border }} />

          {/* Actions */}
          <div style={{ padding: '6px' }}>
            {row('Profile',  () => { router.push(`/dashboard/${userSlug}/settings`); setOpen(false) })}
            {row('Credits',  () => { router.push(`/dashboard/${userSlug}/credits`);  setOpen(false) }, creditBalance ?? 0)}
            {row('Billing',  () => { router.push(`/dashboard/${userSlug}/billing`);  setOpen(false) })}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: border }} />

          {/* Sign out */}
          <div style={{ padding: '6px' }}>
            {row('Sign out', handleSignOut, undefined, true)}
          </div>

        </div>
      )}

      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </div>
  )
}