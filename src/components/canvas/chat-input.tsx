'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { ArrowUp, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Props {
    onSend: (message: string) => void
    isLoading?: boolean
}

export function ChatInput({ onSend, isLoading }: Props) {
    const [message, setMessage] = useState('')
    const [isExpanded, setIsExpanded] = useState(false)
    const collapsedRef = useRef<HTMLTextAreaElement>(null)
    const expandedRef = useRef<HTMLTextAreaElement>(null)
    const { theme, systemTheme } = useTheme()
    const isLight = (theme === 'system' ? systemTheme : theme) === 'light'

    useEffect(() => {
        if (isExpanded && expandedRef.current) {
            const el = expandedRef.current
            el.value = message
            el.focus()
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 140) + 'px'
            el.selectionStart = el.selectionEnd = el.value.length
        }
    }, [isExpanded])

    const handleSend = () => {
        if (!message.trim() || isLoading) return
        onSend(message.trim())
        setMessage('')
        setIsExpanded(false)
    }

    const handleCollapsedChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value
        setMessage(val)
        const el = e.target
        el.style.height = 'auto'
        const sh = el.scrollHeight
        el.style.height = '20px'
        if (sh > 32) setIsExpanded(true)
    }

    const handleCollapsedKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (message.trim()) setIsExpanded(true)
        }
    }

    const handleExpandedChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value
        setMessage(val)
        const el = e.target
        el.style.height = 'auto'
        el.style.height = Math.min(el.scrollHeight, 140) + 'px'
        if (!val) setIsExpanded(false)
    }

    const handleExpandedKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
        if (e.key === 'Backspace' && message === '') {
            setIsExpanded(false)
        }
    }

    const containerStyle: React.CSSProperties = isLight ? {
        background: 'rgba(250,246,238,0.92)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        border: '1px solid rgba(120,96,60,0.12)',
        boxShadow: [
            '0 0 0 0.5px rgba(100,76,40,0.08)',
            '0 4px 24px rgba(80,60,30,0.12)',
            'inset 0 1px 0 rgba(255,255,255,0.90)',
        ].join(', '),
    } : {
        background: 'rgba(18,18,18,0.85)',
        backdropFilter: 'blur(32px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: [
            '0 0 0 0.5px rgba(255,255,255,0.04)',
            '0 4px 24px rgba(0,0,0,0.45)',
            '0 8px 32px rgba(0,0,0,0.35)',
            'inset 0 1px 0 rgba(255,255,255,0.08)',
            'inset 0 -1px 0 rgba(0,0,0,0.2)',
        ].join(', '),
    }

    const sendButton = (
        <button
            onClick={handleSend}
            disabled={!message.trim() || isLoading}
            className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0',
                message.trim() && !isLoading
                    ? 'bg-foreground text-background'
                    : 'opacity-30 bg-foreground/10 text-foreground'
            )}
        >
            {isLoading
                ? <div className='w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin' />
                : <ArrowUp className='w-3.5 h-3.5' />
            }
        </button>
    )

    return (
        <motion.div
            layout
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
            className='relative w-[540px] overflow-hidden'
            style={{
                ...containerStyle,
                borderRadius: isExpanded ? '20px' : '9999px',
            }}
        >
            {/* Specular rim */}
            <div
                className='pointer-events-none absolute inset-x-0 top-0 h-[1px]'
                style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.75) 50%, transparent 95%)' }}
            />

            {/* COLLAPSED */}
            {!isExpanded && (
                <div className='flex items-center gap-2 px-4 py-3'>
                    <button className='text-muted-foreground/50 hover:text-foreground transition-colors flex-shrink-0'>
                        <Plus className='w-4 h-4' />
                    </button>
                    <textarea
                        ref={collapsedRef}
                        value={message}
                        rows={1}
                        onChange={handleCollapsedChange}
                        onKeyDown={handleCollapsedKeyDown}
                        placeholder='What would you like to change or create?'
                        className='flex-1 resize-none text-sm outline-none bg-transparent text-foreground placeholder:text-muted-foreground/40 leading-relaxed min-w-0'
                        style={{ height: '20px', minHeight: '20px', maxHeight: '20px', overflow: 'hidden' }}
                    />
                    {sendButton}
                </div>
            )}

            {/* EXPANDED */}
            {isExpanded && (
                <div className='flex flex-col px-4 pt-3 pb-3 gap-2.5'>
                    <textarea
                        ref={expandedRef}
                        onChange={handleExpandedChange}
                        onKeyDown={handleExpandedKeyDown}
                        placeholder='What would you like to change or create?'
                        className='w-full resize-none text-sm outline-none bg-transparent text-foreground placeholder:text-muted-foreground/40 leading-relaxed'
                        style={{ minHeight: '52px', maxHeight: '140px', overflow: 'hidden' }}
                    />
                    <div className='flex items-center gap-2'>
                        <button className='text-muted-foreground/50 hover:text-foreground transition-colors flex-shrink-0'>
                            <Plus className='w-4 h-4' />
                        </button>
                        <div className='flex-1' />
                        {sendButton}
                    </div>
                </div>
            )}
        </motion.div>
    )
}