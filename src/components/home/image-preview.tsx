'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, ImageIcon } from 'lucide-react'

export interface ImageItem {
  id: string
  previewUrl: string
  storageId: string | null
  error?: boolean
}

interface Props {
  images: ImageItem[]
  onRemove: (id: string) => void
  isLight: boolean
}

export function ImagePreview({ images, onRemove, isLight }: Props) {
  if (!images || images.length === 0) return null

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        style={{ overflow: 'visible', marginBottom: 12 }}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 6, paddingRight: 6 }}>
          {images.map(img => (
            <motion.div
              layout
              key={img.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'relative', flexShrink: 0 }}
            >
              {/* Image tile */}
              <div style={{
                width: 64, height: 64, borderRadius: 10, overflow: 'hidden',
                border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`,
                background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
                position: 'relative',
              }}>
                <img
                  src={img.previewUrl}
                  alt=""
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    opacity: img.storageId === null && !img.error ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                />

                {/* Uploading spinner */}
                {img.storageId === null && !img.error && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 16, height: 16, border: `2px solid ${isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  </div>
                )}

                {/* Error state */}
                {img.error && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 600 }}>FAILED</span>
                  </div>
                )}
              </div>

              {/* Remove button */}
              <button
                onClick={() => onRemove(img.id)}
                style={{
                  position: 'absolute', top: -6, right: -6,
                  width: 20, height: 20, borderRadius: '50%',
                  background: isLight ? '#0a0a0a' : '#ffffff',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                  zIndex: 2,
                }}
              >
                <X style={{ width: 10, height: 10, color: isLight ? '#fff' : '#000' }} />
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}