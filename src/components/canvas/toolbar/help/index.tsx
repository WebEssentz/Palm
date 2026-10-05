'use client'

import { useTheme } from 'next-themes'
import { createPortal } from 'react-dom'
import {
    Fragment,
    useState,
    useRef,
    useEffect,
    useLayoutEffect,
    useMemo,
    type MouseEvent as ReactMouseEvent,
    type CSSProperties,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Sun,
    Moon,
    Monitor,
    Command,
    X,
    BookOpen,
    Bug,
    Lightbulb,
    Mail,
    Palette,
    ArrowUpRight,
    Undo2,
    Redo2,
    Hand,
    MousePointer2,
    Hash,
    Square,
    Circle,
    Pencil,
    Type,
    Minus,
    ArrowRight,
    Eraser,
    Copy,
    ClipboardPaste,
    Group,
    Trash2,
    Move,
    Maximize2,
    Minimize2,
    Focus,
    ZoomIn,
    ZoomOut,
    Map as MapIcon,
    type LucideIcon,
} from 'lucide-react'

// ---- Config -----------------------------------------------------------------
const APP_NAME = 'PALM'
const APP_VERSION = '0.1.0'
const LAST_UPDATED = 'Sep 29, 2026'

const THEME_OPTIONS = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
]

type MenuItem = {
    id: string
    label: string
    icon: LucideIcon
    href?: string // link row
    external?: boolean // shows the ↗ arrow
    hint?: string // right-side shortcut hint
    onClick?: () => void
}

// ---- Shared styles ------------------------------------------------------------
const ROW =
    'group flex items-center gap-2 w-full px-2 py-1.5 rounded-xl text-[13px] font-medium text-left cursor-pointer select-none transition-colors text-neutral-800 dark:text-neutral-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'

const TILE =
    'w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 border border-black/[0.06] dark:border-white/[0.07] bg-black/[0.04] dark:bg-white/[0.07] text-neutral-600 dark:text-neutral-300'

const DIVIDER = 'border-t border-black/[0.07] dark:border-white/[0.08]'

export default function HelpBar() {
    const [menuOpen, setMenuOpen] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [tooltipOpen, setTooltipOpen] = useState(false)
    const { theme, setTheme } = useTheme()
    const popoverRef = useRef<HTMLDivElement>(null)
    const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // TODO: wire up the placeholder links / handlers
    const items: MenuItem[] = [
        { id: 'help', label: 'Help & Resources', icon: BookOpen, href: '#', external: true },
        { id: 'bug', label: 'Report a bug', icon: Bug },
        { id: 'feature', label: 'Suggest a feature', icon: Lightbulb },
        { id: 'support', label: 'Contact support', icon: Mail, href: 'mailto:support@example.com' },
        {
            id: 'shortcuts',
            label: 'Keyboard Shortcuts',
            icon: Command,
            hint: 'Ctrl + .',
            onClick: () => setModalOpen(true),
        },
    ]

    const handleItemClick = (item: MenuItem) => (e: ReactMouseEvent) => {
        if (item.href === '#') e.preventDefault()
        setMenuOpen(false)
        item.onClick?.()
    }

    // Close menu on outside click (capture phase so canvas events don't block it)
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

    // Escape closes everything, Ctrl/Cmd + . toggles shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setModalOpen(false)
                setMenuOpen(false)
            }
            if ((e.ctrlKey || e.metaKey) && e.key === '.') {
                e.preventDefault()
                setMenuOpen(false)
                setModalOpen((o) => !o)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Tooltip with a short hover delay
    const showTooltip = () => {
        if (tooltipTimer.current) clearTimeout(tooltipTimer.current)
        tooltipTimer.current = setTimeout(() => setTooltipOpen(true), 350)
    }
    const hideTooltip = () => {
        if (tooltipTimer.current) clearTimeout(tooltipTimer.current)
        setTooltipOpen(false)
    }
    useEffect(
        () => () => {
            if (tooltipTimer.current) clearTimeout(tooltipTimer.current)
        },
        []
    )

    const activeTheme = theme ?? 'system'

    return (
        <>
            <div className="relative flex items-center" ref={popoverRef}>
                {/* Help button */}
                <button
                    type="button"
                    onClick={() => {
                        hideTooltip()
                        setMenuOpen((o) => !o)
                    }}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                    onFocus={(e) => {
                        if (e.currentTarget.matches(':focus-visible')) showTooltip()
                    }}
                    onBlur={hideTooltip}
                    aria-label="Help"
                    aria-expanded={menuOpen}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer border select-none transition-colors shadow-lg border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 ${
                        menuOpen
                            ? 'bg-neutral-200 dark:bg-white/15'
                            : 'bg-white/95 dark:bg-[#1a1a1c]/95 hover:bg-neutral-100 dark:hover:bg-white/10'
                    }`}
                >
                    <span className="text-xs font-semibold">?</span>
                </button>

                {/* Tooltip: centered above the button */}
                <AnimatePresence>
                    {tooltipOpen && !menuOpen && (
                        <motion.div
                            role="tooltip"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.12, ease: 'easeOut' }}
                            style={{ x: '-50%' }}
                            className="absolute bottom-full left-1/2 mb-2 w-max px-3 py-2 rounded-xl z-50 pointer-events-none whitespace-nowrap border border-black/10 dark:border-white/10 bg-white dark:bg-[#161618] shadow-[0_10px_28px_-8px_rgba(0,0,0,0.35)]"
                        >
                            <div className="text-[13px] font-semibold leading-tight text-neutral-900 dark:text-neutral-50">
                                Help
                            </div>
                            <div className="mt-0.5 text-[12px] leading-snug text-neutral-500 dark:text-neutral-400">
                                Docs, shortcuts, and quick links
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Menu */}
                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.97 }}
                            transition={{ type: 'spring', damping: 26, stiffness: 380 }}
                            style={{ transformOrigin: 'bottom left' }}
                            className="absolute bottom-full left-0 mb-2 w-[248px] rounded-2xl overflow-hidden z-50 border border-black/10 dark:border-white/10 bg-white dark:bg-[#161618] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.4)]"
                        >
                            {/* Links */}
                            <div className="p-1">
                                {items.map((item) => {
                                    const Icon = item.icon
                                    const content = (
                                        <>
                                            <span className={TILE}>
                                                <Icon className="w-3.5 h-3.5" />
                                            </span>
                                            <span className="flex-1 truncate">{item.label}</span>
                                            {item.external && (
                                                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 flex-shrink-0 opacity-40 group-hover:opacity-80 transition-opacity" />
                                            )}
                                            {item.hint && (
                                                <span className="mr-0.5 flex-shrink-0 font-mono text-[10.5px] text-black/40 dark:text-white/35">
                                                    {item.hint}
                                                </span>
                                            )}
                                        </>
                                    )

                                    return item.href ? (
                                        <a
                                            key={item.id}
                                            href={item.href}
                                            target={item.external ? '_blank' : undefined}
                                            rel="noopener noreferrer"
                                            onClick={handleItemClick(item)}
                                            className={ROW}
                                        >
                                            {content}
                                        </a>
                                    ) : (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={handleItemClick(item)}
                                            className={ROW}
                                        >
                                            {content}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Theme: label + compact icon pill */}
                            <div className={`flex items-center gap-2 px-3 py-1.5 ${DIVIDER}`}>
                                <span className={TILE}>
                                    <Palette className="w-3.5 h-3.5" />
                                </span>
                                <span className="flex-1 text-[13px] font-medium text-neutral-800 dark:text-neutral-100">
                                    Theme
                                </span>
                                <div
                                    role="radiogroup"
                                    aria-label="Theme"
                                    className="flex items-center p-0.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08]"
                                >
                                    {THEME_OPTIONS.map((opt) => {
                                        const Icon = opt.icon
                                        const isActive = activeTheme === opt.id
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                role="radio"
                                                aria-checked={isActive}
                                                aria-label={opt.label}
                                                title={opt.label}
                                                onClick={() => setTheme(opt.id)}
                                                className={`relative w-7 h-6 flex items-center justify-center rounded-full cursor-pointer transition-colors ${
                                                    isActive
                                                        ? 'text-neutral-900 dark:text-white'
                                                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100'
                                                }`}
                                            >
                                                {isActive && (
                                                    <motion.span
                                                        layoutId="help-theme-pill"
                                                        transition={{ type: 'spring', damping: 30, stiffness: 420 }}
                                                        className="absolute inset-0 rounded-full bg-white dark:bg-white/[0.16] shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.08]"
                                                    />
                                                )}
                                                <Icon className="relative w-3.5 h-3.5" />
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className={`px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] ${DIVIDER}`}>
                                <div className="flex items-center gap-1 font-mono text-[10.5px] tracking-wide text-black/45 dark:text-white/40">
                                    <span>
                                        {APP_NAME} v{APP_VERSION}
                                    </span>
                                    <ArrowUpRight className="w-3 h-3" />
                                </div>
                                <div className="mt-0.5 font-mono text-[10.5px] tracking-wide text-black/35 dark:text-white/30">
                                    Last updated {LAST_UPDATED}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Shortcuts modal */}
            <ShortcutsModal open={modalOpen} onClose={() => setModalOpen(false)} />
        </>
    )
}

// ---- Shortcuts modal: Liquid Glass ---------------------------------------------
type Shortcut = { label: string; icon: LucideIcon; combos: string[][] }

const SHORTCUT_TABS: { id: string; label: string; items: Shortcut[] }[] = [
    {
        id: 'essentials',
        label: 'Essentials',
        items: [
            { label: 'Undo', icon: Undo2, combos: [['Ctrl', 'Z']] },
            { label: 'Redo', icon: Redo2, combos: [['Ctrl', '⇧', 'Z']] },
            { label: 'Select tool', icon: MousePointer2, combos: [['V']] },
            { label: 'Pan canvas', icon: Hand, combos: [['H'], ['Space']] },
            { label: 'Copy & Paste', icon: ClipboardPaste, combos: [['Ctrl', 'C'], ['Ctrl', 'V']] },
            { label: 'Duplicate', icon: Copy, combos: [['Ctrl', 'D']] },
            { label: 'Group / Ungroup', icon: Group, combos: [['Ctrl', 'G']] },
            { label: 'Delete selection', icon: Trash2, combos: [['Delete']] },
        ],
    },
    {
        id: 'navigation',
        label: 'Navigation',
        items: [
            { label: 'Pan', icon: Move, combos: [['Space', 'drag'], ['two-finger drag']] },
            { label: 'Zoom', icon: Maximize2, combos: [['Ctrl', 'scroll'], ['pinch']] },
            { label: 'Zoom to fit', icon: Minimize2, combos: [['Ctrl', '1']] },
            { label: 'Zoom to selection', icon: Focus, combos: [['Ctrl', '2']] },
            { label: 'Zoom to 100%', icon: ZoomIn, combos: [['Ctrl', '0']] },
            { label: 'Zoom in', icon: ZoomIn, combos: [['Ctrl', '+']] },
            { label: 'Zoom out', icon: ZoomOut, combos: [['Ctrl', '-']] },
            { label: 'Toggle minimap', icon: MapIcon, combos: [['M']] },
        ],
    },
    {
        id: 'tools',
        label: 'Tools',
        items: [
            { label: 'Frame', icon: Hash, combos: [['F']] },
            { label: 'Rectangle', icon: Square, combos: [['R']] },
            { label: 'Ellipse', icon: Circle, combos: [['O']] },
            { label: 'Free draw', icon: Pencil, combos: [['P']] },
            { label: 'Text', icon: Type, combos: [['T']] },
            { label: 'Line', icon: Minus, combos: [['L']] },
            { label: 'Arrow', icon: ArrowRight, combos: [['A']] },
            { label: 'Eraser', icon: Eraser, combos: [['E']] },
        ],
    },
]

const ROW_H = 51
const MAX_ROWS = Math.max(...SHORTCUT_TABS.map((tab) => Math.ceil(tab.items.length / 2)))
const GLASS_ID = 'palm-glass-lens'
const GLASS_RADIUS = 32
const GLASS_BEZEL = 40
const GLASS_STRENGTH = 36

const KEYCAP =
    'inline-flex h-[26px] min-w-[26px] items-center justify-center rounded-md border border-black/10 bg-black/[0.05] px-1.5 font-mono text-[12px] leading-none text-neutral-700 shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)] dark:border-white/[0.14] dark:bg-white/[0.07] dark:text-neutral-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'

const RIM = {
    padding: 1.5,
    background:
        'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.14) 26%, rgba(255,255,255,0.04) 52%, rgba(255,255,255,0.14) 74%, rgba(255,255,255,0.7) 100%)',
    WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
    WebkitMaskComposite: 'xor',
    mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
    maskComposite: 'exclude',
} as CSSProperties

function buildLensMap(width: number, height: number): string {
    const scale = 0.5
    const canvasWidth = Math.max(1, Math.round(width * scale))
    const canvasHeight = Math.max(1, Math.round(height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    const context = canvas.getContext('2d')
    if (!context) return ''
    const image = context.createImageData(canvasWidth, canvasHeight)
    const halfWidth = width / 2
    const halfHeight = height / 2

    for (let y = 0; y < canvasHeight; y++) {
        for (let x = 0; x < canvasWidth; x++) {
            const px = (x + 0.5) / scale - halfWidth
            const py = (y + 0.5) / scale - halfHeight
            const qx = Math.abs(px) - (halfWidth - GLASS_RADIUS)
            const qy = Math.abs(py) - (halfHeight - GLASS_RADIUS)

            let depth: number
            let normalX = 0
            let normalY = 0
            if (qx > 0 && qy > 0) {
                const length = Math.hypot(qx, qy)
                depth = GLASS_RADIUS - length
                normalX = (Math.sign(px) * qx) / length
                normalY = (Math.sign(py) * qy) / length
            } else if (qx > qy) {
                depth = GLASS_RADIUS - qx
                normalX = Math.sign(px)
            } else {
                depth = GLASS_RADIUS - qy
                normalY = Math.sign(py)
            }

            const strength =
                depth >= GLASS_BEZEL
                    ? 0
                    : Math.pow(1 - Math.max(depth, 0) / GLASS_BEZEL, 1.8)
            const offset = (y * canvasWidth + x) * 4
            image.data[offset] = Math.round(128 - normalX * strength * 127)
            image.data[offset + 1] = Math.round(128 - normalY * strength * 127)
            image.data[offset + 2] = 128
            image.data[offset + 3] = 255
        }
    }

    context.putImageData(image, 0, 0)
    return canvas.toDataURL()
}

function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    if (!mounted) return null

    return createPortal(
        <AnimatePresence>{open && <ShortcutsPanel key="shortcuts" onClose={onClose} />}</AnimatePresence>,
        document.body
    )
}

function ShortcutsPanel({ onClose }: { onClose: () => void }) {
    const [active, setActive] = useState(SHORTCUT_TABS[0].id)
    const [size, setSize] = useState({ width: 0, height: 0 })
    const panelRef = useRef<HTMLDivElement>(null)

    useLayoutEffect(() => {
        const element = panelRef.current
        if (!element) return
        const measure = () =>
            setSize((previous) =>
                previous.width === element.offsetWidth && previous.height === element.offsetHeight
                    ? previous
                    : { width: element.offsetWidth, height: element.offsetHeight }
            )
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(element)
        return () => observer.disconnect()
    }, [])

    const lensMap = useMemo(
        () => (size.width > 0 ? buildLensMap(size.width, size.height) : ''),
        [size.width, size.height]
    )

    const tab = SHORTCUT_TABS.find((item) => item.id === active) ?? SHORTCUT_TABS[0]
    const half = Math.ceil(tab.items.length / 2)
    const columns = [tab.items.slice(0, half), tab.items.slice(half)]

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <svg aria-hidden focusable="false" className="pointer-events-none absolute h-0 w-0">
                <defs>
                    <filter id={GLASS_ID} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                        {lensMap && (
                            <feImage
                                href={lensMap}
                                x="0"
                                y="0"
                                width={size.width}
                                height={size.height}
                                preserveAspectRatio="none"
                                result="map"
                            />
                        )}
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="map"
                            scale={GLASS_STRENGTH}
                            xChannelSelector="R"
                            yChannelSelector="G"
                        />
                    </filter>
                </defs>
            </svg>

            <div className="absolute inset-0" onClick={onClose} />

            <motion.div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Keyboard shortcuts"
                initial={{ opacity: 0, scale: 0.96, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 8 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                style={lensMap ? { backdropFilter: `url(#${GLASS_ID}) saturate(1.4)` } : undefined}
                className="relative z-10 w-full max-w-[820px] select-none overflow-hidden rounded-[32px] bg-white/45 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35),inset_0_0_0_1px_rgba(0,0,0,0.06)] dark:bg-[#18181b]/55 dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_1px_1px_rgba(255,255,255,0.22)]"
            >
                <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]" style={RIM} />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-32"
                    style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.09), rgba(255,255,255,0))' }}
                />

                <div className="relative">
                    <div className="relative border-b border-black/[0.08] dark:border-white/10">
                        <div
                            role="tablist"
                            aria-label="Shortcut categories"
                            className="flex items-stretch justify-center gap-1 px-12"
                        >
                            {SHORTCUT_TABS.map((item) => {
                                const isActive = item.id === active
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => setActive(item.id)}
                                        className={`relative cursor-pointer whitespace-nowrap px-4 py-4 text-[15px] font-medium transition-colors ${
                                            isActive
                                                ? 'text-neutral-950 dark:text-white'
                                                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100'
                                        }`}
                                    >
                                        {item.label}
                                        {isActive && (
                                            <motion.span
                                                layoutId="shortcuts-tab-underline"
                                                transition={{ type: 'spring', damping: 30, stiffness: 420 }}
                                                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-neutral-950 dark:bg-white"
                                            />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-black/[0.06] hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div
                        role="tabpanel"
                        className="max-h-[calc(100vh-8rem)] overflow-y-auto px-8 pb-4 pt-1"
                        style={{ minHeight: MAX_ROWS * ROW_H + 19 }}
                    >
                        <motion.div
                            key={tab.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.16, ease: 'easeOut' }}
                            className="grid grid-cols-1 gap-x-10 md:grid-cols-2"
                        >
                            {columns.map((column, columnIndex) => (
                                <div key={columnIndex}>
                                    {column.map((item) => {
                                        const Icon = item.icon
                                        return (
                                            <div
                                                key={item.label}
                                                className="flex items-center justify-between gap-4 border-b border-black/[0.07] py-3 dark:border-white/[0.08] md:last:border-b-0"
                                            >
                                                <span className="flex min-w-0 items-center gap-3 text-[15px] font-medium text-neutral-800 dark:text-neutral-100">
                                                    <Icon className="h-4 w-4 flex-shrink-0 text-neutral-500 dark:text-neutral-400" />
                                                    <span className="truncate">{item.label}</span>
                                                </span>
                                                <span className="flex flex-shrink-0 items-center gap-2">
                                                    {item.combos.map((combo, comboIndex) => (
                                                        <Fragment key={comboIndex}>
                                                            {comboIndex > 0 && (
                                                                <span className="text-[12px] text-neutral-500 dark:text-neutral-400">
                                                                    or
                                                                </span>
                                                            )}
                                                            <span className="flex items-center gap-1">
                                                                {combo.map((key) => (
                                                                    <kbd key={key} className={KEYCAP}>
                                                                        {key}
                                                                    </kbd>
                                                                ))}
                                                            </span>
                                                        </Fragment>
                                                    ))}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}