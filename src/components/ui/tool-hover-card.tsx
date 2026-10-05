'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { HelpCircle } from 'lucide-react'

export type ToolIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>

export interface ToolInfo {
    /** Card title, e.g. "Rectangle" */
    label: string
    /** Short line under the title */
    tagline: string
    /** Longer explanation above the preview */
    description: string
    /** Used for the small badge AND the default big preview */
    icon: ToolIcon
    /** Single key or combo shown in the footer. Leave out and the footer is hidden. */
    shortcut?: string
    /** Optional override for the preview box (image, gif, <video>, whatever) */
    preview?: React.ReactNode
}

interface ToolHoverCardProps {
    info: ToolInfo
    children: React.ReactNode
    /** Gap between the hovered button and the card */
    offset?: number
    openDelay?: number
    closeDelay?: number
}

// remembers when a card last closed, so moving button to button feels instant
let lastClosedAt = 0

export function ToolHoverCard({
    info,
    children,
    offset = 12,
    openDelay = 140,
    closeDelay = 60,
}: ToolHoverCardProps) {
    const [open, setOpen] = React.useState(false)
    const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null)

    const triggerRef = React.useRef<HTMLDivElement>(null)
    const cardRef = React.useRef<HTMLDivElement>(null)
    const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const openRef = React.useRef(false)

    const clear = () => {
        if (timer.current) clearTimeout(timer.current)
    }

    const show = () => {
        clear()
        const warm = Date.now() - lastClosedAt < 300
        timer.current = setTimeout(() => {
            openRef.current = true
            setOpen(true)
        }, warm ? 0 : openDelay)
    }

    const hide = () => {
        clear()
        timer.current = setTimeout(() => {
            if (openRef.current) lastClosedAt = Date.now()
            openRef.current = false
            setOpen(false)
        }, closeDelay)
    }

    const keepOpen = () => {
        clear()
        openRef.current = true
        setOpen(true)
    }

    // close immediately on click so it doesn't linger over whatever the tool opens
    const closeNow = () => {
        clear()
        if (openRef.current) lastClosedAt = Date.now()
        openRef.current = false
        setOpen(false)
    }

    // position: to the right of the button, vertically centered on it, clamped to the viewport
    React.useLayoutEffect(() => {
        if (!open) {
            setPos(null)
            return
        }
        const trigger = triggerRef.current
        const card = cardRef.current
        if (!trigger || !card) return

        const r = trigger.getBoundingClientRect()
        const h = card.offsetHeight
        const margin = 12
        const top = Math.min(Math.max(r.top, margin), window.innerHeight - h - margin)

        setPos({ top, left: r.right + offset })
    }, [open, offset])

    React.useEffect(() => {
        if (!open) return
        window.addEventListener('resize', closeNow)
        return () => window.removeEventListener('resize', closeNow)
    }, [open])

    React.useEffect(() => clear, [])

    const Icon = info.icon

    return (
        <>
            <div
                ref={triggerRef}
                className='flex'
                onMouseEnter={show}
                onMouseLeave={hide}
                onPointerDown={closeNow}
            >
                {children}
            </div>

            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {open && (
                            <motion.div
                                ref={cardRef}
                                role='tooltip'
                                onMouseEnter={keepOpen}
                                onMouseLeave={hide}
                                initial={{ opacity: 0, x: -8, scale: 0.97 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -4, scale: 0.98 }}
                                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                                style={{
                                    top: pos?.top ?? 0,
                                    left: pos?.left ?? 0,
                                    visibility: pos ? 'visible' : 'hidden',
                                }}
                                className='fixed z-[100] w-[340px] origin-left pointer-events-auto rounded-[24px] p-4 bg-white/95 dark:bg-[#141416]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl'
                            >
                                {/* Header: icon badge + title + tagline */}
                                <div className='flex items-center gap-3'>
                                    <div className='w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] text-neutral-700 dark:text-neutral-200'>
                                        <Icon className='w-5 h-5' strokeWidth={1.8} />
                                    </div>
                                    <div className='min-w-0'>
                                        <p className='text-sm font-semibold text-neutral-900 dark:text-white leading-tight'>
                                            {info.label}
                                        </p>
                                        <p className='text-[13px] text-neutral-500 dark:text-neutral-400 leading-snug mt-0.5'>
                                            {info.tagline}
                                        </p>
                                    </div>
                                </div>

                                {/* Description */}
                                <p className='mt-4 text-[13px] leading-relaxed text-neutral-700 dark:text-neutral-300'>
                                    {info.description}
                                </p>

                                {/* Preview box: default is a big version of the icon on a dot grid */}
                                <div className='mt-3 h-40 rounded-2xl overflow-hidden flex items-center justify-center bg-black/[0.03] dark:bg-black/40 border border-black/[0.06] dark:border-white/[0.06] bg-[radial-gradient(circle,rgba(128,128,128,0.22)_1px,transparent_1px)] [background-size:14px_14px]'>
                                    {info.preview ?? (
                                        <Icon
                                            className='w-12 h-12 text-neutral-400 dark:text-neutral-500'
                                            strokeWidth={1.3}
                                        />
                                    )}
                                </div>

                                {/* Footer: shortcut hint (hidden if the tool has no shortcut) */}
                                {info.shortcut && (
                                    <div className='mt-3 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400'>
                                        <HelpCircle className='w-3.5 h-3.5 shrink-0' />
                                        <span>Press</span>
                                        <kbd className='px-1.5 py-0.5 rounded-md bg-black/[0.06] dark:bg-white/[0.08] text-[11px] font-medium text-neutral-700 dark:text-neutral-200'>
                                            {info.shortcut}
                                        </kbd>
                                        <span>to switch to {info.label}</span>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </>
    )
}

export default ToolHoverCard
