'use client'

import { useInfiniteCanvas } from "@/hooks/use-canvas"
import { setScale } from "@/redux/slice/viewport"
import { motion, AnimatePresence } from "framer-motion"
import { ZoomIn, ZoomOut, Check } from "lucide-react"
import { useDispatch } from "react-redux"
import { useTheme } from "next-themes"
import { useState, useRef, useEffect } from "react"

const ZOOM_PRESETS = [
    { label: 'Fit', value: null },
    { label: '25%', value: 0.25 },
    { label: '50%', value: 0.50 },
    { label: '75%', value: 0.75 },
    { label: '100%', value: 1.00 },
    { label: '150%', value: 1.50 },
    { label: '200%', value: 2.00 },
]

const ZoomBar = () => {
    const dispatch = useDispatch()
    const { viewport } = useInfiniteCanvas()
    const { theme, systemTheme } = useTheme()
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    const effectiveTheme = theme === 'system' ? systemTheme : theme
    const isLight = effectiveTheme === 'light'

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleZoomOut = () => {
        const newScale = Math.max(viewport.scale / 1.2, viewport.minScale)
        dispatch(setScale({ scale: newScale }))
    }

    const handleZoomIn = () => {
        const newScale = Math.min(viewport.scale * 1.2, viewport.maxScale)
        dispatch(setScale({ scale: newScale }))
    }

    const handlePreset = (value: number | null) => {
        if (value === null) {
            // Fit — reset to 1 or your fit-to-screen logic
            dispatch(setScale({ scale: 1 }))
        } else {
            const clamped = Math.min(Math.max(value, viewport.minScale), viewport.maxScale)
            dispatch(setScale({ scale: clamped }))
        }
        setOpen(false)
    }

    const currentPct = Math.round(viewport.scale * 100)

    const liquidGlass: React.CSSProperties = isLight ? {
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
            '0 4px 24px rgba(0,0,0,0.45)',
            '0 8px 32px rgba(0,0,0,0.35)',
            'inset 0 1px 0 rgba(255,255,255,0.08)',
            'inset 0 -1px 0 rgba(0,0,0,0.2)',
        ].join(', '),
    }

    const iconBtnBase: React.CSSProperties = isLight ? {
        background: 'transparent',
        border: '1px solid transparent',
        color: 'var(--foreground)',
    } : {
        background: 'transparent',
        border: '1px solid transparent',
        color: 'var(--foreground)',
    }

    return (
        <div className="relative flex items-center gap-1" ref={menuRef}>

            {/* ── Zoom Out ── */}
            <button
                onClick={handleZoomOut}
                title="Zoom out"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer"
                style={isLight ? {
                    ...liquidGlass,
                    background: 'rgba(250,246,238,0.80)',
                } : {
                    ...liquidGlass,
                    background: 'rgba(255,255,255,0.06)',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = isLight ? 'rgba(220,210,195,0.90)' : 'rgba(255,255,255,0.12)'
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = isLight ? 'rgba(250,246,238,0.80)' : 'rgba(255,255,255,0.06)'
                }}
            >
                <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* ── Percentage Pill — clickable ── */}
            <button
                onClick={() => setOpen(o => !o)}
                className="h-8 px-3 rounded-full flex items-center justify-center font-mono text-xs font-medium transition-all cursor-pointer relative"
                style={liquidGlass}
            >
                {/* specular rim */}
                <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-[1px] rounded-full"
                    style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.90) 50%, transparent 90%)' }}
                />
                <span className={isLight ? 'text-black/75' : 'text-white/75'}>
                    {currentPct}%
                </span>
            </button>

            {/* ── Zoom In ── */}
            <button
                onClick={handleZoomIn}
                title="Zoom in"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer"
                style={isLight ? {
                    ...liquidGlass,
                    background: 'rgba(250,246,238,0.80)',
                } : {
                    ...liquidGlass,
                    background: 'rgba(255,255,255,0.06)',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = isLight ? 'rgba(220,210,195,0.90)' : 'rgba(255,255,255,0.12)'
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = isLight ? 'rgba(250,246,238,0.80)' : 'rgba(255,255,255,0.06)'
                }}
            >
                <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {/* ── Dropdown menu ── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                        className="absolute bottom-12 left-1/2 -translate-x-1/2 w-40 rounded-2xl overflow-hidden z-50"
                        style={liquidGlass}
                    >
                        {/* specular rim */}
                        <div
                            className="pointer-events-none absolute inset-x-0 top-0 h-[1px] z-10"
                            style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.90) 50%, transparent 90%)' }}
                        />

                        <div className="p-1.5 flex flex-col gap-0.5">
                            {ZOOM_PRESETS.map((preset) => {
                                const isActive = preset.value !== null
                                    ? Math.abs(viewport.scale - preset.value) < 0.01
                                    : Math.abs(viewport.scale - 1) < 0.01 && preset.value === null

                                return (
                                    <button
                                        key={preset.label}
                                        onClick={() => handlePreset(preset.value)}
                                        className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer text-left"
                                        style={{
                                            color: isLight ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.75)',
                                            background: 'transparent',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)'
                                            e.currentTarget.style.color = isLight ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,1)'
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = 'transparent'
                                            e.currentTarget.style.color = isLight ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.75)'
                                        }}
                                    >
                                        <span className="font-medium">{preset.label}</span>
                                        {isActive && <Check className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />}
                                    </button>
                                )
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default ZoomBar