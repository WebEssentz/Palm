'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImageIcon, Globe, Sparkles, Plus } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

interface Props {
    onUpload: (file: File) => void
    onUrl: (url: string) => void
    onEnhance: () => void
    enhancing?: boolean
    hasInput?: boolean
}

export function AttachmentMenu({ onUpload, onUrl, onEnhance, enhancing, hasInput }: Props) {
    const [open, setOpen] = useState(false)
    const [urlMode, setUrlMode] = useState(false)
    const [urlValue, setUrlValue] = useState('')
    const { theme, systemTheme } = useTheme()
    const fileRef = useRef<HTMLInputElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    const effectiveTheme = theme === 'system' ? systemTheme : theme
    const isLight = effectiveTheme === 'light'

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false)
                setUrlMode(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) { onUpload(file); setOpen(false) }
    }

    const handleUrl = () => {
        if (urlValue.trim()) {
            onUrl(urlValue.trim())
            setUrlValue('')
            setUrlMode(false)
            setOpen(false)
        }
    }

    const glassStyle = isLight ? {
        background: 'rgba(250,246,238,0.92)',
        backdropFilter: 'blur(32px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
        border: '1px solid rgba(120,96,60,0.14)',
        boxShadow: [
            '0 0 0 0.5px rgba(100,76,40,0.08)',
            '0 4px 24px rgba(80,60,30,0.14)',
            '0 8px 32px rgba(80,60,30,0.10)',
            'inset 0 1px 0 rgba(255,255,255,0.95)',
            'inset 0 -1px 0 rgba(100,76,40,0.04)',
        ].join(', '),
    } : {
        background: 'rgba(18,18,18,0.85)',
        backdropFilter: 'blur(32px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: [
            '0 0 0 0.5px rgba(255,255,255,0.04)',
            '0 4px 24px rgba(0,0,0,0.4)',
            '0 8px 32px rgba(0,0,0,0.3)',
            'inset 0 1px 0 rgba(255,255,255,0.08)',
            'inset 0 -1px 0 rgba(0,0,0,0.2)',
        ].join(', '),
    }

    return (
        <div className='relative' ref={menuRef}>
            <input
                ref={fileRef}
                type='file'
                accept='image/*'
                className='hidden'
                onChange={handleFile}
            />

            {/* Trigger */}
            <button
                onClick={() => { setOpen(o => !o); setUrlMode(false) }}
                className='w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer'
                style={isLight ? {
                    background: 'rgba(250,246,238,0.88)',
                    backdropFilter: 'url(#palm-glass-light) blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(120,96,60,0.10)',
                    boxShadow: [
                        '0 0 0 0.5px rgba(100,76,40,0.08)',
                        '0 2px 4px rgba(80,60,30,0.06)',
                        '0 8px 20px rgba(80,60,30,0.09)',
                        'inset 0 1px 0 rgba(255,255,255,0.90)',
                        'inset 0 -1px 0 rgba(100,76,40,0.04)',
                    ].join(', '),
                } : {
                    background: 'rgba(255,255,255,0.07)',
                    backdropFilter: 'url(#palm-glass-light) blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: [
                        '0 0 0 0.5px rgba(255,255,255,0.04)',
                        '0 2px 4px rgba(0,0,0,0.12)',
                        '0 8px 20px rgba(0,0,0,0.24)',
                        'inset 0 1px 0 rgba(255,255,255,0.08)',
                        'inset 0 -1px 0 rgba(0,0,0,0.2)',
                    ].join(', '),
                }}
            >
                <Plus className='w-4 h-4' />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                        className='absolute bottom-14 left-0 w-48 rounded-2xl overflow-hidden z-50'
                        style={glassStyle}
                    >
                        {/* Specular rim */}
                        <div
                            className='pointer-events-none absolute inset-x-0 top-0 h-[1px] z-10'
                            style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.90) 50%, transparent 90%)' }}
                        />

                        {!urlMode ? (
                            <div className='p-1.5 flex flex-col gap-0.5'>
                                <MenuItem
                                    icon={<ImageIcon className='w-4 h-4' />}
                                    label='Upload image'
                                    onClick={() => fileRef.current?.click()}
                                    isLight={isLight}
                                />
                                <MenuItem
                                    icon={<Globe className='w-4 h-4' />}
                                    label='Website URL'
                                    onClick={() => setUrlMode(true)}
                                    isLight={isLight}
                                />
                                <div className={cn('h-px mx-2 my-0.5', isLight ? 'bg-black/[0.06]' : 'bg-white/[0.06]')} />
                                <MenuItem
                                    icon={
                                        enhancing
                                            ? <div className='w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin' />
                                            : <Sparkles className='w-4 h-4' />
                                    }
                                    label='Enhance prompt'
                                    onClick={() => { onEnhance(); setOpen(false) }}
                                    isLight={isLight}
                                    disabled={!hasInput}
                                />
                            </div>
                        ) : (
                            <div className='p-3 flex flex-col gap-2'>
                                <p className={cn('text-xs px-1', isLight ? 'text-black/40' : 'text-white/40')}>Paste a URL</p>
                                <input
                                    autoFocus
                                    value={urlValue}
                                    onChange={e => setUrlValue(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleUrl()}
                                    placeholder='https://...'
                                    className={cn(
                                        'w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors',
                                        isLight
                                            ? 'bg-black/[0.05] border border-black/10 text-black placeholder:text-black/30 focus:border-black/20'
                                            : 'bg-white/[0.06] border border-white/10 text-white placeholder:text-white/30 focus:border-white/20'
                                    )}
                                />
                                <div className='flex gap-2'>
                                    <button
                                        onClick={() => setUrlMode(false)}
                                        className={cn(
                                            'flex-1 py-1.5 rounded-lg text-xs border transition-colors',
                                            isLight
                                                ? 'border-black/10 text-black/50 hover:text-black/80 hover:bg-black/[0.04]'
                                                : 'border-white/10 text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
                                        )}
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleUrl}
                                        disabled={!urlValue.trim()}
                                        className={cn(
                                            'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40',
                                            isLight ? 'bg-black text-white hover:bg-black/80' : 'bg-white text-black hover:bg-white/90'
                                        )}
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function MenuItem({
    icon, label, onClick, isLight, disabled
}: {
    icon: React.ReactNode
    label: string
    onClick: () => void
    isLight: boolean
    disabled?: boolean
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl transition-colors text-left cursor-pointer text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed',
                isLight
                    ? 'text-black/75 hover:bg-black/[0.05] hover:text-black'
                    : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
            )}
        >
            <span className='flex-shrink-0 opacity-60'>{icon}</span>
            {label}
        </button>
    )
}
