'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useTheme } from 'next-themes'

interface RenameProjectModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectName: string
    onConfirm: (newName: string) => void | Promise<void>
    isLoading?: boolean
}

export function RenameProjectModal({
    open,
    onOpenChange,
    projectName,
    onConfirm,
    isLoading = false,
}: RenameProjectModalProps) {
    const { theme, systemTheme } = useTheme()
    const effectiveTheme = theme === 'system' ? systemTheme : theme
    const isLight = effectiveTheme === 'light'
    const inputRef = useRef<HTMLInputElement>(null)
    const [inputValue, setInputValue] = useState(projectName)

    useEffect(() => { setInputValue(projectName) }, [projectName])

    useEffect(() => {
        if (open) {
            setTimeout(() => {
                inputRef.current?.focus()
                inputRef.current?.select()
            }, 80)
        }
    }, [open])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !isDisabled) handleConfirm()
        if (e.key === 'Escape') onOpenChange(false)
    }

    const handleConfirm = async () => {
        if (inputValue.trim() && inputValue !== projectName) {
            await onConfirm(inputValue.trim())
            onOpenChange(false)
        }
    }

    const isDisabled = !inputValue.trim() || inputValue === projectName || isLoading

    return (
        <>
            {/* Inline SVG filter — always in DOM when modal mounts */}
            <svg style={{ position: 'fixed', width: 0, height: 0, overflow: 'hidden', top: 0, left: 0 }} aria-hidden>
                <defs>
                    <filter id='pg-liquid' x='-20%' y='-20%' width='140%' height='140%' colorInterpolationFilters='sRGB'>
                        <feTurbulence type='fractalNoise' baseFrequency='0.65 0.42' numOctaves='3' seed='12' result='noise'>
                            <animate attributeName='baseFrequency' values='0.65 0.42;0.68 0.44;0.65 0.42' dur='8s' repeatCount='indefinite' />
                        </feTurbulence>
                        <feGaussianBlur in='noise' stdDeviation='1.6' result='blurNoise' />
                        <feDisplacementMap in='SourceGraphic' in2='blurNoise' scale='10' xChannelSelector='R' yChannelSelector='G' result='displaced' />
                        <feColorMatrix in='displaced' type='saturate' values='1.4' result='saturated' />
                        <feComposite in='saturated' in2='SourceGraphic' operator='atop' />
                    </filter>
                </defs>
            </svg>

            <Dialog open={open} onOpenChange={onOpenChange}>
                {/* Strip ALL shadcn defaults — we own the entire surface */}
                <DialogContent className='sm:max-w-[360px] w-[360px] gap-0 p-0 border-0 bg-transparent shadow-none [&>button]:hidden'>
                    <DialogTitle className='sr-only'>Rename Project</DialogTitle>
                    <AnimatePresence>
                        {open && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                                transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                                className='relative rounded-2xl overflow-hidden'
                                style={isLight ? {
                                    background: 'rgba(248, 244, 237, 0.82)',
                                    backdropFilter: 'url(#pg-liquid) blur(24px) saturate(1.6)',
                                    WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
                                    border: '1px solid rgba(255,255,255,0.70)',
                                    boxShadow: [
                                        '0 0 0 0.5px rgba(100,76,40,0.10)',
                                        '0 4px 6px rgba(80,60,30,0.06)',
                                        '0 12px 28px rgba(80,60,30,0.12)',
                                        '0 32px 64px rgba(80,60,30,0.08)',
                                        'inset 0 1px 0 rgba(255,255,255,0.95)',
                                        'inset 0 -1px 0 rgba(100,76,40,0.05)',
                                    ].join(', '),
                                } : {
                                    background: 'rgba(28,28,30,0.72)',
                                    backdropFilter: 'url(#pg-liquid) blur(24px) saturate(1.8)',
                                    WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                                    border: '1px solid rgba(255,255,255,0.10)',
                                    boxShadow: [
                                        '0 0 0 0.5px rgba(255,255,255,0.06)',
                                        '0 4px 6px rgba(0,0,0,0.18)',
                                        '0 12px 28px rgba(0,0,0,0.32)',
                                        '0 32px 64px rgba(0,0,0,0.22)',
                                        'inset 0 1px 0 rgba(255,255,255,0.10)',
                                        'inset 0 -1px 0 rgba(0,0,0,0.25)',
                                    ].join(', '),
                                }}
                            >
                                {/* Specular top highlight */}
                                <div
                                    className='pointer-events-none absolute inset-x-0 top-0 h-[1px]'
                                    style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.9) 50%, transparent 95%)' }}
                                />

                                <div className='px-5 pt-5 pb-4 space-y-4'>
                                    <p className='text-sm font-semibold text-foreground tracking-tight'>
                                        Rename Project
                                    </p>

                                    <input
                                        ref={inputRef}
                                        type='text'
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder='Project name'
                                        className='w-full px-3 py-2 rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all'
                                        style={isLight ? {
                                            background: 'rgba(255,251,244,0.75)',
                                            border: '1px solid rgba(120,96,60,0.12)',
                                            boxShadow: 'inset 0 1px 3px rgba(80,60,30,0.07), 0 1px 0 rgba(255,255,255,0.8)',
                                        } : {
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                                        }}
                                    />

                                    <div className='flex items-center justify-end gap-2'>
                                        <button
                                            onClick={() => onOpenChange(false)}
                                            disabled={isLoading}
                                            className='px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer'
                                            style={isLight ? {
                                                background: 'rgba(0,0,0,0.04)',
                                            } : {
                                                background: 'rgba(255,255,255,0.06)',
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleConfirm}
                                            disabled={isDisabled}
                                            className='px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
                                            style={{
                                                background: isDisabled
                                                    ? (isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.10)')
                                                    : (isLight ? '#1a1a1a' : '#ffffff'),
                                                color: isDisabled
                                                    ? 'var(--muted-foreground)'
                                                    : (isLight ? '#ffffff' : '#000000'),
                                            }}
                                        >
                                            {isLoading ? 'Renaming…' : 'Rename'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </DialogContent>
            </Dialog>
        </>
    )
}