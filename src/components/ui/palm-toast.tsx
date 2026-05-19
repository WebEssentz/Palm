'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastOptions {
    type?: ToastType
    duration?: number
    action?: { label: string; onClick: () => void }
}

interface ToastItem {
    id: string
    message: string
    type: ToastType
    duration: number
    action?: { label: string; onClick: () => void }
}

interface ToastContextValue {
    addToast: (message: string, options?: ToastOptions) => void
}

export const PalmToastContext = createContext<ToastContextValue | null>(null)

export function PalmToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([])
    const { theme, systemTheme } = useTheme()
    const isLight = (theme === 'system' ? systemTheme : theme) === 'light'

    const addToast = useCallback((message: string, options?: ToastOptions) => {
        const id = Math.random().toString(36).slice(2, 9)
        setToasts(prev => [...prev, {
            id,
            message,
            type: options?.type ?? 'success',
            duration: options?.duration ?? 3500,
            action: options?.action,
        }])
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const glassStyle: React.CSSProperties = isLight ? {
        background: 'rgba(248,244,237,0.90)',
        backdropFilter: 'blur(24px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
        border: '1px solid rgba(255,255,255,0.75)',
        boxShadow: [
            '0 0 0 0.5px rgba(100,76,40,0.10)',
            '0 4px 6px rgba(80,60,30,0.06)',
            '0 12px 28px rgba(80,60,30,0.14)',
            'inset 0 1px 0 rgba(255,255,255,0.95)',
            'inset 0 -1px 0 rgba(100,76,40,0.04)',
        ].join(', '),
    } : {
        background: 'rgba(28,28,30,0.85)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: [
            '0 0 0 0.5px rgba(255,255,255,0.06)',
            '0 4px 6px rgba(0,0,0,0.20)',
            '0 12px 28px rgba(0,0,0,0.36)',
            'inset 0 1px 0 rgba(255,255,255,0.10)',
            'inset 0 -1px 0 rgba(0,0,0,0.20)',
        ].join(', '),
    }

    return (
        <PalmToastContext.Provider value={{ addToast }}>
            {children}

            {/* SVG filter — same pg-liquid pattern */}
            <svg style={{ position: 'fixed', width: 0, height: 0, overflow: 'hidden', top: 0, left: 0 }} aria-hidden>
                <defs>
                    <filter id='pg-liquid-toast' x='-20%' y='-20%' width='140%' height='140%' colorInterpolationFilters='sRGB'>
                        <feTurbulence type='fractalNoise' baseFrequency='0.65 0.42' numOctaves='3' seed='12' result='noise'>
                            <animate attributeName='baseFrequency' values='0.65 0.42;0.68 0.44;0.65 0.42' dur='8s' repeatCount='indefinite' />
                        </feTurbulence>
                        <feGaussianBlur in='noise' stdDeviation='1.6' result='blurNoise' />
                        <feDisplacementMap in='SourceGraphic' in2='blurNoise' scale='8' xChannelSelector='R' yChannelSelector='G' result='displaced' />
                        <feColorMatrix in='displaced' type='saturate' values='1.4' result='saturated' />
                        <feComposite in='saturated' in2='SourceGraphic' operator='atop' />
                    </filter>
                </defs>
            </svg>

            {/* Toast stack — top right */}
            <div className='fixed top-4 right-4 z-[200] flex flex-col gap-2 items-end pointer-events-none'>
                <AnimatePresence mode='popLayout'>
                    {toasts.map(toast => (
                        <ToastPill
                            key={toast.id}
                            toast={toast}
                            onRemove={removeToast}
                            glassStyle={glassStyle}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </PalmToastContext.Provider>
    )
}

function ToastPill({
    toast,
    onRemove,
    glassStyle,
}: {
    toast: ToastItem
    onRemove: (id: string) => void
    glassStyle: React.CSSProperties
}) {
    const [paused, setPaused] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const remainingRef = useRef(toast.duration)
    const startTimeRef = useRef(Date.now())

    const startTimer = useCallback(() => {
        startTimeRef.current = Date.now()
        timerRef.current = setTimeout(() => onRemove(toast.id), remainingRef.current)
    }, [onRemove, toast.id])

    const pauseTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current)
        remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startTimeRef.current))
        setPaused(true)
    }, [])

    const resumeTimer = useCallback(() => {
        setPaused(false)
        startTimer()
    }, [startTimer])

    useEffect(() => {
        startTimer()
        return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    }, [startTimer])

    const icons: Record<ToastType, React.ReactNode> = {
        success: <CheckCircle className='w-3.5 h-3.5 text-emerald-500 flex-shrink-0' />,
        error:   <XCircle    className='w-3.5 h-3.5 text-red-500    flex-shrink-0' />,
        info:    <Info       className='w-3.5 h-3.5 text-blue-400   flex-shrink-0' />,
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 16, scale: 0.94 }}
            animate={{ opacity: 1, x: 0,  scale: 1    }}
            exit={{    opacity: 0, x: 16, scale: 0.94 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            onMouseEnter={pauseTimer}
            onMouseLeave={resumeTimer}
            className='relative overflow-hidden rounded-full pointer-events-auto'
            style={glassStyle}
        >
            {/* Specular top highlight */}
            <div
                className='pointer-events-none absolute inset-x-0 top-0 h-[1px]'
                style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.9) 50%, transparent 95%)' }}
            />

            {/* Content */}
            <div className='flex items-center gap-2 px-4 py-2.5 pr-3'>
                {icons[toast.type]}

                <span className='text-xs font-medium text-foreground whitespace-nowrap'>
                    {toast.message}
                </span>

                {toast.action && (
                    <button
                        onClick={() => { toast.action!.onClick(); onRemove(toast.id) }}
                        className='text-xs font-semibold text-primary hover:opacity-75 transition-opacity ml-0.5 flex-shrink-0 cursor-pointer'
                    >
                        {toast.action.label}
                    </button>
                )}

                <button
                    onClick={() => onRemove(toast.id)}
                    className='ml-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 cursor-pointer'
                >
                    <X className='w-3 h-3' />
                </button>
            </div>

            {/* Progress drain bar */}
            <div className='absolute bottom-0 left-0 right-0 h-[2px] bg-foreground/5 rounded-full'>
                <div
                    className='h-full bg-foreground/25 rounded-full origin-left'
                    style={{
                        animation: `palm-toast-drain ${toast.duration}ms linear forwards`,
                        animationPlayState: paused ? 'paused' : 'running',
                    }}
                />
            </div>
        </motion.div>
    )
}