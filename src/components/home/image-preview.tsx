'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useTheme } from 'next-themes'

export interface ImageItem {
    id: string
    previewUrl: string
    storageId: string | null
}

interface Props {
    images: ImageItem[]
    onRemove: (id: string) => void
}

export function ImagePreview({ images, onRemove }: Props) {
    const { theme, systemTheme } = useTheme()
    const isLight = (theme === 'system' ? systemTheme : theme) === 'light'

    if (!images || images.length === 0) return null

    const xStyle: React.CSSProperties = isLight ? {
        background: 'rgba(250,246,238,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(120,96,60,0.14)',
        boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.95)',
            '0 2px 6px rgba(80,60,30,0.14)',
        ].join(', '),
        color: 'rgba(0,0,0,0.55)',
    } : {
        background: 'rgba(22,22,22,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.08)',
            '0 2px 6px rgba(0,0,0,0.35)',
        ].join(', '),
        color: 'rgba(255,255,255,0.65)',
    }

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className='overflow-hidden mb-3'
        >
            <div
                className='image-preview-scroll flex items-start gap-2 pb-2 overflow-x-auto'
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: isLight
                        ? 'rgba(120,96,60,0.20) transparent'
                        : 'rgba(255,255,255,0.10) transparent',
                }}
            >
                <style>{`
            .image-preview-scroll::-webkit-scrollbar {
                height: 3px;
            }
            .image-preview-scroll::-webkit-scrollbar-track {
                background: transparent;
            }
            .image-preview-scroll::-webkit-scrollbar-thumb {
                border-radius: 9999px;
                background: ${isLight ? 'rgba(120,96,60,0.20)' : 'rgba(255,255,255,0.10)'};
            }
            .image-preview-scroll::-webkit-scrollbar-thumb:hover {
                background: ${isLight ? 'rgba(120,96,60,0.35)' : 'rgba(255,255,255,0.20)'};
            }
        `}</style>
                <AnimatePresence mode='popLayout'>
                    {images.map(img => (
                        <motion.div
                            key={img.id}
                            initial={{ opacity: 0, scale: 0.88 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.88 }}
                            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                            className='relative flex-shrink-0 group'
                        >
                            <img
                                src={img.previewUrl}
                                alt=''
                                className='h-20 w-auto rounded-lg object-cover'
                                style={{
                                    maxWidth: '130px',
                                    opacity: img.storageId === null ? 0.65 : 1,
                                    transition: 'opacity 0.3s ease',
                                    boxShadow: isLight
                                        ? '0 2px 8px rgba(80,60,30,0.14), inset 0 0 0 1px rgba(120,96,60,0.12)'
                                        : '0 2px 8px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.08)',
                                }}
                            />

                            {img.storageId === null && (
                                <div className='absolute inset-0 flex items-center justify-center rounded-lg'>
                                    <div className='w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin' />
                                </div>
                            )}

                            <button
                                onClick={() => onRemove(img.id)}
                                className='absolute top-1 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10'
                                style={xStyle}
                            >
                                <X className='w-2.5 h-2.5' />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}