'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTheme } from 'next-themes'

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

interface GlassTooltipProps {
    content: string
    children: React.ReactNode
    side?: TooltipSide   // default: 'right'
    disabled?: boolean   // pass true to skip rendering tooltip entirely
    delay?: number       // ms before showing, default 400
}

const POSITION: Record<TooltipSide, string> = {
    right:  'left-full ml-2.5 top-1/2 -translate-y-1/2',
    left:   'right-full mr-2.5 top-1/2 -translate-y-1/2',
    top:    'bottom-full mb-2.5 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2.5 left-1/2 -translate-x-1/2',
}

const MOTION: Record<TooltipSide, { initial: object; exit: object }> = {
    right:  { initial: { opacity: 0, x: -6,  scale: 0.94 }, exit: { opacity: 0, x: -6,  scale: 0.94 } },
    left:   { initial: { opacity: 0, x: 6,   scale: 0.94 }, exit: { opacity: 0, x: 6,   scale: 0.94 } },
    top:    { initial: { opacity: 0, y: 6,   scale: 0.94 }, exit: { opacity: 0, y: 6,   scale: 0.94 } },
    bottom: { initial: { opacity: 0, y: -6,  scale: 0.94 }, exit: { opacity: 0, y: -6,  scale: 0.94 } },
}

export function GlassTooltip({
    content,
    children,
    side = 'right',
    disabled = false,
    delay = 400,
}: GlassTooltipProps) {
    const [visible, setVisible] = useState(false)
    const timerRef = useState<ReturnType<typeof setTimeout> | null>(null)
    const { theme, systemTheme } = useTheme()
    const isLight = (theme === 'system' ? systemTheme : theme) === 'light'

    const show = () => {
        timerRef[1](setTimeout(() => setVisible(true), delay))
    }

    const hide = () => {
        if (timerRef[0]) clearTimeout(timerRef[0])
        timerRef[1](null)
        setVisible(false)
    }

    const glassStyle: React.CSSProperties = isLight ? {
        background: 'rgba(248,244,237,0.92)',
        backdropFilter: 'blur(20px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
        border: '1px solid rgba(255,255,255,0.75)',
        boxShadow: [
            '0 0 0 0.5px rgba(100,76,40,0.10)',
            '0 2px 8px rgba(80,60,30,0.10)',
            '0 8px 20px rgba(80,60,30,0.08)',
            'inset 0 1px 0 rgba(255,255,255,0.95)',
            'inset 0 -1px 0 rgba(100,76,40,0.04)',
        ].join(', '),
    } : {
        background: 'rgba(28,28,30,0.88)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: [
            '0 0 0 0.5px rgba(255,255,255,0.06)',
            '0 2px 8px rgba(0,0,0,0.20)',
            '0 8px 20px rgba(0,0,0,0.28)',
            'inset 0 1px 0 rgba(255,255,255,0.10)',
            'inset 0 -1px 0 rgba(0,0,0,0.20)',
        ].join(', '),
    }

    // Don't wrap at all when disabled — zero overhead
    if (disabled) return <>{children}</>

    return (
        <div
            className='relative inline-flex'
            onMouseEnter={show}
            onMouseLeave={hide}
        >
            {children}

            <AnimatePresence>
                {visible && (
                    <motion.div
                        initial={{ ...MOTION[side].initial }}
                        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                        exit={{ ...MOTION[side].exit }}
                        transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                        className={`absolute ${POSITION[side]} z-[300] pointer-events-none whitespace-nowrap`}
                    >
                        <div
                            className='relative overflow-hidden rounded-full px-2.5 py-1'
                            style={glassStyle}
                        >
                            {/* Specular top highlight */}
                            <div
                                className='pointer-events-none absolute inset-x-0 top-0 h-[1px]'
                                style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.9) 50%, transparent 95%)' }}
                            />
                            <span className='text-xs font-medium text-foreground select-none'>
                                {content}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
