'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ImageIcon, Globe, Sparkles, Plus } from 'lucide-react'

interface Props {
  onUpload: (file: File) => void
  onUrl: () => void
  onEnhance: () => void
  enhancing?: boolean
  hasInput?: boolean
  isLight: boolean
}

export function AttachmentMenu({ onUpload, onUrl, onEnhance, enhancing, hasInput, isLight }: Props) {
  const [open, setOpen]       = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const fileRef       = useRef<HTMLInputElement>(null)
  const triggerRef    = useRef<HTMLButtonElement>(null)
  const menuRef       = useRef<HTMLDivElement>(null)
  const portalRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return
      if (portalRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { onUpload(file); setOpen(false) }
  }

  const toggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.top, left: rect.left })
    }
    setOpen(o => !o)
  }

  const border  = isLight ? 'rgba(0,0,0,0.08)'  : 'rgba(255,255,255,0.08)'
  const itemTxt = isLight ? 'rgba(0,0,0,0.7)'   : 'rgba(255,255,255,0.7)'

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

      <button
        ref={triggerRef}
        onClick={toggle}
        style={{
          width: 30, height: 30, borderRadius: '50%', border: 'none',
          background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <Plus style={{ width: 14, height: 14 }} />
      </button>

      {typeof window !== 'undefined' && open && menuPos && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={portalRef}
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed', zIndex: 9999,
                width: 180, borderRadius: 12, overflow: 'hidden',
                background: isLight ? '#ffffff' : '#1a1a1a',
                border: `1px solid ${border}`,
                boxShadow: isLight
                  ? '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)'
                  : '0 4px 24px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3)',
                bottom: window.innerHeight - menuPos.top + 8,
                left: menuPos.left,
              }}
            >
              <div style={{ padding: 5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  { icon: <ImageIcon style={{ width: 14, height: 14 }} />, label: 'Upload image',   onClick: () => { fileRef.current?.click() } },
                  { icon: <Globe     style={{ width: 14, height: 14 }} />, label: 'Website URL',    onClick: () => { onUrl(); setOpen(false) } },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '8px 10px', borderRadius: 8,
                      background: 'transparent', border: 'none',
                      color: itemTxt, fontSize: 13, fontWeight: 400,
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ opacity: 0.55, display: 'flex' }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}

                <div style={{ height: 1, background: border, margin: '3px 8px' }} />

                <button
                  onClick={() => { onEnhance(); setOpen(false) }}
                  disabled={!hasInput}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '8px 10px', borderRadius: 8,
                    background: 'transparent', border: 'none',
                    color: itemTxt, fontSize: 13, fontWeight: 400,
                    cursor: hasInput ? 'pointer' : 'not-allowed',
                    opacity: hasInput ? 1 : 0.38, textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (hasInput) e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)' }}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ opacity: 0.55, display: 'flex' }}>
                    {enhancing
                      ? <div style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                      : <Sparkles style={{ width: 14, height: 14 }} />
                    }
                  </span>
                  Enhance prompt
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}