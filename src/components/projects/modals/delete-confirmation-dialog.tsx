'use client'

import { AlertDialog, AlertDialogContent, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'

interface DeleteConfirmationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectName: string
    onConfirm: () => void
    isLoading?: boolean
    customTitle?: string
    customDescription?: string
}

export function DeleteConfirmationDialog({
    open,
    onOpenChange,
    projectName,
    onConfirm,
    isLoading = false,
    customTitle,
    customDescription,
}: DeleteConfirmationDialogProps) {
    const { theme, systemTheme } = useTheme()
    const effectiveTheme = theme === 'system' ? systemTheme : theme
    const isLight = effectiveTheme === 'light'

    return (
        <>
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

            <AlertDialog open={open} onOpenChange={onOpenChange}>
                <AlertDialogContent className='sm:max-w-[360px] w-[360px] gap-0 p-0 border-0 bg-transparent shadow-none [&>button]:hidden'>
                    <AlertDialogTitle className='sr-only'>Delete {projectName}</AlertDialogTitle>
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

                                <div className='px-5 pt-5 pb-4 space-y-3'>
                                    <div className='space-y-1'>
                                        <p className='text-sm font-semibold text-foreground tracking-tight'>
                                            {customTitle || `Delete "${projectName}"?`}
                                        </p>
                                        <p className='text-xs text-muted-foreground leading-relaxed'>
                                            {customDescription || 'This can be recovered from Trash for 3 days.'}
                                        </p>
                                    </div>

                                    <div className='flex items-center justify-end gap-2 pt-1'>
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
                                            onClick={onConfirm}
                                            disabled={isLoading}
                                            className='px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50'
                                            style={{
                                                background: 'rgba(220, 38, 38, 0.90)',
                                                color: '#ffffff',
                                                boxShadow: '0 1px 3px rgba(220,38,38,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                                            }}
                                        >
                                            {isLoading ? 'Deleting…' : 'Delete'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}