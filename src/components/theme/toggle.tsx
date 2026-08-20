'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

const options = [
  { label: 'Light',  value: 'light',  icon: Sun     },
  { label: 'System', value: 'system', icon: Monitor  },
  { label: 'Dark',   value: 'dark',   icon: Moon     },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen]     = useState(false)
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!mounted) return <div className="w-8 h-8 rounded-full" />

  const Icon = options.find(o => o.value === theme)?.icon ?? Monitor

  return (
    <div ref={ref} className="relative">

      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--toggle-bg)',
          border: '1px solid var(--toggle-border)',
          cursor: 'pointer',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <style>{`
          :root { --toggle-bg: #0a0a0a; --toggle-border: rgba(0,0,0,0.1); --toggle-icon: #ffffff; --menu-bg: #0a0a0a; --menu-border: rgba(255,255,255,0.08); --item-text: rgba(255,255,255,0.44); --item-active-bg: rgba(255,255,255,0.08); --item-active-text: #ffffff; --item-hover-bg: rgba(255,255,255,0.05); }
          .dark { --toggle-bg: #ffffff; --toggle-border: rgba(255,255,255,0.1); --toggle-icon: #0a0a0a; --menu-bg: #ffffff; --menu-border: rgba(0,0,0,0.08); --item-text: rgba(0,0,0,0.44); --item-active-bg: rgba(0,0,0,0.06); --item-active-text: #0a0a0a; --item-hover-bg: rgba(0,0,0,0.04); }
        `}</style>
        <Icon style={{ width: 14, height: 14, color: 'var(--toggle-icon)' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', bottom: 44, right: 0, zIndex: 50,
          width: 140, borderRadius: 16, overflow: 'hidden',
          background: 'var(--menu-bg)',
          border: '1px solid var(--menu-border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          animation: 'fadeUp 0.18s ease forwards',
        }}>
          <style>{`
            @keyframes fadeUp {
              from { opacity: 0; transform: translateY(6px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0)   scale(1);    }
            }
          `}</style>

          <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {options.map(({ label, value, icon: ItemIcon }) => {
              const active = theme === value
              return (
                <button
                  key={value}
                  onClick={() => { setTheme(value); setOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '8px 10px', borderRadius: 10,
                    background: active ? 'var(--item-active-bg)' : 'transparent',
                    color: active ? 'var(--item-active-text)' : 'var(--item-text)',
                    fontSize: 12, fontWeight: active ? 600 : 400,
                    border: 'none', cursor: 'pointer',
                    transition: 'background 0.12s, color 0.12s',
                    letterSpacing: '-0.01em',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--item-hover-bg)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <ItemIcon style={{ width: 13, height: 13, flexShrink: 0 }} />
                  {label}
                  {active && (
                    <svg style={{ marginLeft: 'auto', width: 11, height: 11 }} viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}