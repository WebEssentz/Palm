'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
    label: string
    state: 'running' | 'done'
    isLight: boolean
}

export function ToolStatusBubble({ label, state, isLight }: Props) {
    const [displayLabel, setDisplayLabel] = useState(label)

    useEffect(() => { setDisplayLabel(label) }, [label])

    const color = isLight ? 'rgba(60,40,10,0.45)' : 'rgba(255,255,255,0.35)'

    return (
        <div className='flex items-center gap-1.5'>
            {state === 'running' ? (
                <div
                    className='w-3 h-3 rounded-full border-2 flex-shrink-0 animate-spin'
                    style={{ borderColor: color, borderTopColor: 'transparent' }}
                />
            ) : (
                <motion.svg
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    width='12' height='12' viewBox='0 0 12 12' fill='none'
                    className='flex-shrink-0'
                >
                    <path d='M2 6l2.5 2.5 5.5-5' stroke={color}
                        strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                </motion.svg>
            )}
            <AnimatePresence mode='wait'>
                <motion.span
                    key={displayLabel}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.15 }}
                    className='text-xs whitespace-nowrap'
                    style={{ color }}
                >
                    {displayLabel}
                </motion.span>
            </AnimatePresence>
        </div>
    )
}
