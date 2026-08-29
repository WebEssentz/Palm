'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

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

    const show = () => {
        timerRef[1](setTimeout(() => setVisible(true), delay))
    }

    const hide = () => {
        if (timerRef[0]) clearTimeout(timerRef[0])
        timerRef[1](null)
        setVisible(false)
    }

    // Reset tooltip visibility when disabled changes
    useEffect(() => {
        if (timerRef[0]) clearTimeout(timerRef[0])
        timerRef[1](null)
        setVisible(false)
    }, [disabled])

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
                            className='overflow-hidden rounded-full border border-black/10 bg-white px-2.5 py-1 shadow-sm dark:border-white/10 dark:bg-neutral-900'
                        >
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
