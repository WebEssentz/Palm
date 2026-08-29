'use client'

import { useInfiniteCanvas } from "@/hooks/use-canvas"
import { setScale } from "@/redux/slice/viewport"
import { motion, AnimatePresence } from "framer-motion"
import { Check } from "lucide-react"
import { useDispatch } from "react-redux"
import { useState, useRef, useEffect } from "react"

const ZOOM_PRESETS = [
    { label: 'Fit',  value: null },
    { label: '25%',  value: 0.25 },
    { label: '50%',  value: 0.50 },
    { label: '75%',  value: 0.75 },
    { label: '100%', value: 1.00 },
    { label: '150%', value: 1.50 },
    { label: '200%', value: 2.00 },
]

const ZoomBar = () => {
    const dispatch = useDispatch()
    const { viewport } = useInfiniteCanvas()
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const handler = (e: Event) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('pointerdown', handler, { capture: true })
        document.addEventListener('mousedown', handler, { capture: true })
        return () => {
            document.removeEventListener('pointerdown', handler, { capture: true })
            document.removeEventListener('mousedown', handler, { capture: true })
        }
    }, [open])

    const handlePreset = (value: number | null) => {
        const target = value ?? 1
        dispatch(setScale({ scale: Math.min(Math.max(target, viewport.minScale), viewport.maxScale) }))
        setOpen(false)
    }

    const currentPct = Math.round(viewport.scale * 100)

    return (
        <div className="relative flex items-center" ref={menuRef}>
            {/* Percentage pill */}
            <button
                onClick={() => setOpen(o => !o)}
                className="h-8 px-3 rounded-full flex items-center justify-center font-mono text-xs font-medium cursor-pointer border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-black/70 dark:text-white/70 shadow-sm"
            >
                <span>{currentPct}%</span>
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 340 }}
                        className="absolute bottom-11 left-0 w-36 rounded-2xl overflow-hidden z-50 border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-xl"
                    >
                        <div className="p-1.5 flex flex-col gap-0.5">
                            {ZOOM_PRESETS.map((preset) => {
                                const isActive = preset.value !== null
                                    ? Math.abs(viewport.scale - preset.value) < 0.01
                                    : Math.abs(viewport.scale - 1) < 0.01

                                return (
                                    <button
                                        key={preset.label}
                                        onClick={() => handlePreset(preset.value)}
                                        className="flex items-center justify-between w-full px-3 py-1.5 rounded-xl text-sm cursor-pointer text-left transition-colors text-black/80 dark:text-white/80 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                    >
                                        <span className="font-medium">{preset.label}</span>
                                        {isActive && <Check className="w-3 h-3 opacity-50 flex-shrink-0" />}
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