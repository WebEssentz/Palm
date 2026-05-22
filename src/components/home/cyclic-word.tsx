'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const WORDS = ['design', 'create', 'build', 'ship', 'prototype', 'imagine']
const PREFIX = 'What will you'
const TYPE_SPEED = 52

export function CyclingWord() {
    const [charCount, setCharCount] = useState(0)
    const [typingDone, setTypingDone] = useState(false)
    const [cursorOn, setCursorOn] = useState(true)
    const [wordIndex, setWordIndex] = useState(0)
    const [wordVisible, setWordVisible] = useState(false)

    // ── Typewriter ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (typingDone) return
        if (charCount < PREFIX.length) {
            const t = setTimeout(() => setCharCount(c => c + 1), TYPE_SPEED)
            return () => clearTimeout(t)
        }
        const t = setTimeout(() => {
            setTypingDone(true)
            setTimeout(() => setWordVisible(true), 180)
        }, 700)
        return () => clearTimeout(t)
    }, [charCount, typingDone])

    // ── Cursor blink ────────────────────────────────────────────────────────
    useEffect(() => {
        if (typingDone) return
        const t = setInterval(() => setCursorOn(v => !v), 500)
        return () => clearInterval(t)
    }, [typingDone])

    // ── Word cycling ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!typingDone) return
        const t = setInterval(() => {
            setWordVisible(false)
            setTimeout(() => {
                setWordIndex(i => (i + 1) % WORDS.length)
                setWordVisible(true)
            }, 500)
        }, 10000)
        return () => clearInterval(t)
    }, [typingDone])

    return (
        <span>
            {/* ── Typed prefix ──────────────────────────────────────────────── */}
            <span className='text-foreground'>
                {PREFIX.slice(0, charCount)}
                {!typingDone && (
                    <span
                        aria-hidden="true"
                        className={cn(
                            'inline-block w-1 h-[0.78em] bg-foreground ml-1 rounded-sm align-middle',
                            cursorOn ? 'opacity-100' : 'opacity-0',
                            'transition-opacity duration-75'
                        )}
                    />
                )}
            </span>

            {/* ── Cycling word ────────────────────────────────────────────────── */}
            {typingDone && (
                <>
                    <span
                        className={cn(
                            'text-[#A07850] transition-all duration-500 inline-block ml-2',
                            wordVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 -translate-y-2 blur-sm'
                        )}
                    >
                        {WORDS[wordIndex]}
                    </span>
                    <span className='text-foreground'>?</span>
                </>
            )}
        </span>
    )
}