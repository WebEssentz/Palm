'use client'

import { useInfiniteCanvas } from "@/hooks/use-canvas"
import { setScale } from "@/redux/slice/viewport"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Map, Minus, Plus } from "lucide-react"
import { useDispatch } from "react-redux"
import { useState, useRef, useEffect, useCallback, Fragment } from "react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { animateViewport, easeOutCubic } from "@/lib/viewport-animator"

// ---- Zoom math ----------------------------------------------------------------
// Discrete stops, like Figma / Flora. Zoom in/out snaps to the next stop
// instead of adding a flat 0.1, so steps feel even at every scale.
const ZOOM_STOPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]
const EPS = 0.005

const nextStop = (scale: number) =>
    ZOOM_STOPS.find((s) => s > scale + EPS) ?? ZOOM_STOPS[ZOOM_STOPS.length - 1]

const prevStop = (scale: number) => {
    for (let i = ZOOM_STOPS.length - 1; i >= 0; i--) {
        if (ZOOM_STOPS[i] < scale - EPS) return ZOOM_STOPS[i]
    }
    return ZOOM_STOPS[0]
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

// Zooming has to keep the world point under `origin` fixed on screen:
//   worldPoint  = (origin - offset) / oldScale
//   newOffset   = origin - worldPoint * newScale
//               = origin - (origin - offset) * (newScale / oldScale)
// setScale({ scale, originScreen }) is expected to apply exactly that.
const getOrigin = () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 })

// ---- Menu config ----------------------------------------------------------------
type ZoomAction = 'fit' | 'selection' | 'in' | 'out' | number

type ZoomItem = {
    id: string
    label: string
    action: ZoomAction
    keys?: string[]
}

const PRESET_ITEMS: ZoomItem[] = [
    { id: 'fit', label: 'Zoom to fit', action: 'fit', keys: ['Ctrl', '1'] },
    { id: 'selection', label: 'Zoom to selection', action: 'selection', keys: ['Ctrl', '2'] },
]

const LEVEL_ITEMS: ZoomItem[] = [
    { id: '50', label: 'Zoom to 50%', action: 0.5 },
    { id: '100', label: 'Zoom to 100%', action: 1, keys: ['Ctrl', '0'] },
    { id: '200', label: 'Zoom to 200%', action: 2 },
]

const STEP_ITEMS: ZoomItem[] = [
    { id: 'in', label: 'Zoom in', action: 'in', keys: ['Ctrl', '+'] },
    { id: 'out', label: 'Zoom out', action: 'out', keys: ['Ctrl', '-'] },
]

// ---- Shared styles (same language as HelpBar) --------------------------------------
const ICON_BTN =
    'w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none'

const ROW =
    'group flex items-center gap-2 w-full pl-2 pr-2.5 py-1.5 rounded-xl text-[13px] font-medium text-left cursor-pointer select-none transition-colors text-neutral-800 dark:text-neutral-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'

const KEY =
    'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border border-black/10 bg-black/[0.04] px-1 font-mono text-[10.5px] leading-none text-neutral-500 dark:border-white/[0.12] dark:bg-white/[0.06] dark:text-neutral-400'

const DIVIDER = 'my-1 h-px bg-black/[0.07] dark:bg-white/[0.08]'

interface ZoomBarProps {
    onToggleMinimap?: (e?: React.MouseEvent) => void
    isMinimapOpen?: boolean
}

const ZoomBar = ({ onToggleMinimap, isMinimapOpen }: ZoomBarProps = {}) => {
    const dispatch = useDispatch()
    const { viewport } = useInfiniteCanvas()
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // Keep the latest values in a ref so the global key listener never goes stale
    const live = useRef({ viewport, isMinimapOpen, onToggleMinimap })
    live.current = { viewport, isMinimapOpen, onToggleMinimap }

    // ---- Actions ---------------------------------------------------------------
    const applyScale = useCallback(
        (target: number) => {
            const { minScale, maxScale, scale, translate } = live.current.viewport
            const next = clamp(target, minScale, maxScale)
            if (Math.abs(next - scale) < 0.0001) return

            const origin = getOrigin()
            // offset' = origin - (origin - offset) * (newScale / oldScale)
            const targetX = origin.x - (origin.x - translate.x) * (next / scale)
            const targetY = origin.y - (origin.y - translate.y) * (next / scale)

            animateViewport({
                dispatch,
                startScale: scale,
                startTranslate: translate,
                targetScale: next,
                targetTranslate: { x: targetX, y: targetY },
                duration: 320,
                easing: easeOutCubic,
            })
        },
        [dispatch]
    )

    const runAction = useCallback(
        (action: ZoomAction) => {
            const { scale } = live.current.viewport
            if (action === 'fit') {
                window.dispatchEvent(new CustomEvent('canvas-zoom-to-fit'))
            } else if (action === 'selection') {
                window.dispatchEvent(new CustomEvent('canvas-zoom-to-selection'))
            } else if (action === 'in') {
                applyScale(nextStop(scale))
            } else if (action === 'out') {
                applyScale(prevStop(scale))
            } else {
                applyScale(action)
            }
        },
        [applyScale]
    )

    const toggleMinimap = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation()
        const { onToggleMinimap: handler } = live.current
        if (handler) handler(e)
        else window.dispatchEvent(new CustomEvent('toggle-minimap'))
    }, [])

    // ---- Outside click + Escape for the dropdown ------------------------------------
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

    // ---- Keyboard shortcuts -----------------------------------------------------------
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false)
                return
            }

            const el = e.target as HTMLElement | null
            const typing =
                !!el &&
                (el.tagName === 'INPUT' ||
                    el.tagName === 'TEXTAREA' ||
                    el.tagName === 'SELECT' ||
                    el.isContentEditable)
            if (typing) return

            const mod = e.ctrlKey || e.metaKey

            // M -> toggle minimap (no modifiers)
            if (!mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'm') {
                e.preventDefault()
                setOpen(false)
                toggleMinimap()
                return
            }

            if (!mod || e.altKey) return

            switch (e.key) {
                case '0':
                    e.preventDefault()
                    runAction(1)
                    break
                case '1':
                    e.preventDefault()
                    runAction('fit')
                    break
                case '2':
                    e.preventDefault()
                    runAction('selection')
                    break
                case '=':
                case '+':
                    e.preventDefault()
                    runAction('in')
                    break
                case '-':
                case '_':
                    e.preventDefault()
                    runAction('out')
                    break
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [runAction, toggleMinimap])

    const currentPct = Math.round(viewport.scale * 100)
    const atMin = viewport.scale <= viewport.minScale + EPS
    const atMax = viewport.scale >= viewport.maxScale - EPS

    const isActiveLevel = (item: ZoomItem) =>
        typeof item.action === 'number' && Math.abs(viewport.scale - item.action) < 0.005

    const renderItem = (item: ZoomItem) => (
        <button
            key={item.id}
            type="button"
            onClick={() => {
                runAction(item.action)
                setOpen(false)
            }}
            className={ROW}
        >
            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                {isActiveLevel(item) && <Check className="h-3.5 w-3.5 opacity-70" strokeWidth={2.4} />}
            </span>
            <span className="flex-1 truncate">{item.label}</span>
            {item.keys && (
                <span className="flex flex-shrink-0 items-center gap-0.5">
                    {item.keys.map((k, i) => (
                        <Fragment key={i}>
                            <kbd className={KEY}>{k}</kbd>
                        </Fragment>
                    ))}
                </span>
            )}
        </button>
    )

    return (
        <div className="relative flex items-center" ref={menuRef}>
            {/* Zoom pill */}
            <div className="flex h-10 select-none items-center gap-0.5 rounded-2xl border border-black/10 bg-white/95 px-1.5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-[#1a1a1c]/95">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                runAction('out')
                            }}
                            disabled={atMin}
                            aria-label="Zoom out"
                            className={ICON_BTN}
                        >
                            <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" sideOffset={8}>
                        Zoom out
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={() => setOpen((o) => !o)}
                            aria-label="Zoom presets"
                            aria-haspopup="menu"
                            aria-expanded={open}
                            className={cn(
                                'flex h-7 min-w-[46px] items-center justify-center rounded-lg px-1.5 font-mono text-[12px] font-semibold tabular-nums transition-colors cursor-pointer',
                                open
                                    ? 'bg-black/[0.08] text-neutral-900 dark:bg-white/15 dark:text-white'
                                    : 'text-neutral-800 hover:bg-black/[0.06] dark:text-neutral-200 dark:hover:bg-white/10 dark:hover:text-white'
                            )}
                        >
                            {currentPct}%
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" sideOffset={8}>
                        Zoom presets
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                runAction('in')
                            }}
                            disabled={atMax}
                            aria-label="Zoom in"
                            className={ICON_BTN}
                        >
                            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" sideOffset={8}>
                        Zoom in
                    </TooltipContent>
                </Tooltip>

                <div className="mx-0.5 h-4 w-px bg-black/10 dark:bg-white/15" />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={(e) => toggleMinimap(e)}
                            aria-label="Toggle minimap"
                            aria-pressed={!!isMinimapOpen}
                            className={cn(
                                'w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer',
                                isMinimapOpen
                                    ? 'bg-black/10 text-neutral-900 dark:bg-white/20 dark:text-white'
                                    : 'text-neutral-500 hover:bg-black/[0.06] hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white'
                            )}
                        >
                            <Map className="h-3.5 w-3.5" strokeWidth={1.8} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" sideOffset={8}>
                        <span className="flex items-center gap-2">
                            {isMinimapOpen ? 'Hide minimap' : 'Show minimap'}
                            <kbd className={KEY}>M</kbd>
                        </span>
                    </TooltipContent>
                </Tooltip>
            </div>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        role="menu"
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 380 }}
                        style={{ transformOrigin: 'bottom left' }}
                        className="absolute bottom-full left-0 z-50 mb-2 w-[236px] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.4)] dark:border-white/10 dark:bg-[#161618]"
                    >
                        <div className="p-1">
                            {PRESET_ITEMS.map(renderItem)}
                            <div className={DIVIDER} />
                            {LEVEL_ITEMS.map(renderItem)}
                            <div className={DIVIDER} />
                            {STEP_ITEMS.map(renderItem)}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default ZoomBar