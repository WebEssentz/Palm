'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const WORDS = ['design', 'create', 'build', 'ship', 'prototype', 'imagine']

export function CyclingWord() {
    const [index, setIndex] = useState(0)
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        const interval = setInterval(() => {
            // fade out
            setVisible(false)
            setTimeout(() => {
                setIndex(i => (i + 1) % WORDS.length)
                setVisible(true)   // fade in with new word
            }, 500)
        }, 10000)

        return () => clearInterval(interval)
    }, [])

    return (
        <span className='inline-flex items-baseline gap-0'>
            <span
                className={cn(
                    'text-[#A07850] transition-all duration-500',
                    visible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 -translate-y-2 blur-sm'
                )}
            >
                {WORDS[index]}
            </span>
            <span className='text-foreground'>?</span>
        </span>
    )
}
