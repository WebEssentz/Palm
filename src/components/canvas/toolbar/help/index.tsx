'use client'

import { useTheme } from 'next-themes'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Monitor, Keyboard, Check, X } from 'lucide-react'

const SHORTCUT_SECTIONS = [
    {
        title: 'Tools',
        items: [
            { key: 'V', label: 'Select tool' },
            { key: 'H / Space', label: 'Pan canvas' },
            { key: 'F', label: 'Frame' },
            { key: 'R', label: 'Rectangle' },
            { key: 'O', label: 'Ellipse' },
            { key: 'P', label: 'Free draw' },
            { key: 'T', label: 'Text' },
            { key: 'L', label: 'Line' },
            { key: 'A', label: 'Arrow' },
            { key: 'E', label: 'Eraser' },
        ],
    },
    {
        title: 'Actions & History',
        items: [
            { key: 'Ctrl + Z', label: 'Undo' },
            { key: 'Ctrl + Shift + Z', label: 'Redo' },
            { key: 'Ctrl + D', label: 'Duplicate' },
            { key: 'Ctrl + G', label: 'Group / Ungroup' },
            { key: 'Ctrl + C / V', label: 'Copy & Paste' },
            { key: 'Delete', label: 'Delete selection' },
        ],
    },
]

export default function HelpBar() {
    const [menuOpen, setMenuOpen] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const { theme, setTheme } = useTheme()
    const popoverRef = useRef<HTMLDivElement>(null)

    // Close menu on click/tap outside (capture phase so canvas events don't block it)
    useEffect(() => {
        if (!menuOpen) return

        const handler = (e: Event) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setMenuOpen(false)
            }
        }
        document.addEventListener('pointerdown', handler, { capture: true })
        document.addEventListener('mousedown', handler, { capture: true })
        return () => {
            document.removeEventListener('pointerdown', handler, { capture: true })
            document.removeEventListener('mousedown', handler, { capture: true })
        }
    }, [menuOpen])

    // Close modal on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setModalOpen(false)
                setMenuOpen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const themeOptions = [
        { id: 'light', label: 'Light', icon: Sun },
        { id: 'dark', label: 'Dark', icon: Moon },
        { id: 'system', label: 'System', icon: Monitor },
    ]

    return (
        <>
            <div className="relative flex items-center" ref={popoverRef}>
                {/* Question Mark Button */}
                <button
                    type="button"
                    onClick={() => setMenuOpen((o) => !o)}
                    title="Settings & Shortcuts"
                    className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-black/70 dark:text-white/70 shadow-sm"
                >
                    <span className="text-xs font-semibold select-none">?</span>
                </button>

                {/* Compact Menu */}
                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.96 }}
                            transition={{ type: 'spring', damping: 24, stiffness: 340 }}
                            className="absolute bottom-11 left-0 w-50 rounded-2xl overflow-hidden z-50 border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-xl p-1.5"
                        >
                            <div className="flex flex-col gap-0.5">
                                {/* Shortcut Keys item (no arrow) */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMenuOpen(false)
                                        setModalOpen(true)
                                    }}
                                    className="flex items-center w-full px-2.5 py-2 rounded-xl text-[13.5px] font-medium cursor-pointer text-left transition-colors text-black/80 dark:text-white/80 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Keyboard className="w-4 h-4 opacity-70 flex-shrink-0" />
                                        <span>Shortcut keys</span>
                                    </div>
                                </button>

                                {/* Divider line */}
                                <div className="h-px bg-black/10 dark:bg-white/10 my-1 mx-1" />

                                {/* Theme Options */}
                                {themeOptions.map((opt) => {
                                    const Icon = opt.icon
                                    const isActive = theme === opt.id

                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => {
                                                setTheme(opt.id)
                                                setMenuOpen(false)
                                            }}
                                            className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-[13.5px] font-medium cursor-pointer text-left transition-colors text-black/80 dark:text-white/80 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <Icon className="w-4 h-4 opacity-70 flex-shrink-0" />
                                                <span>{opt.label}</span>
                                            </div>
                                            {isActive && <Check className="w-3.5 h-3.5 opacity-70 flex-shrink-0" />}
                                        </button>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Smooth Blurred Backdrop Shortcuts Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        {/* Backdrop with Blur */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setModalOpen(false)}
                            className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md"
                        />

                        {/* Modal Dialog Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: 'spring', damping: 26, stiffness: 350 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-md rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden z-10"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-black/70 dark:text-white/70">
                                        <Keyboard className="w-4 h-4" />
                                    </div>
                                    <h2 className="text-sm font-semibold text-foreground">
                                        Keyboard Shortcuts
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Shortcuts Content */}
                            <div className="p-5 max-h-[65vh] overflow-y-auto space-y-5">
                                {SHORTCUT_SECTIONS.map((section) => (
                                    <div key={section.title} className="space-y-2">
                                        <div className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                                            {section.title}
                                        </div>
                                        <div className="grid grid-cols-1 gap-1">
                                            {section.items.map((item) => (
                                                <div
                                                    key={item.label}
                                                    className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60 transition-colors"
                                                >
                                                    <span className="text-foreground/90 font-medium">
                                                        {item.label}
                                                    </span>
                                                    <kbd className="px-2 py-0.5 font-mono text-[10px] rounded-md border border-black/10 dark:border-white/10 bg-neutral-100 dark:bg-neutral-800 text-foreground/80 font-medium shadow-2xs">
                                                        {item.key}
                                                    </kbd>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}
