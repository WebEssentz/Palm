'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type MenuIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>

export interface MenuOption {
    value: string
    label: string
    icon: MenuIcon
}

/**
 * Add a row by adding one object of these shapes to the `items` array.
 * - toggle:  a row with a check that flips on/off
 * - submenu: a row that opens a flyout of options on hover, active one is checked
 * - divider: a thin line
 */
export type FlyoutMenuItem =
    | { type: 'divider'; id: string }
    | {
          type: 'toggle'
          id: string
          label: string
          icon: MenuIcon
          checked: boolean
          onChange: (next: boolean) => void
      }
    | {
          type: 'submenu'
          id: string
          label: string
          icon: MenuIcon
          options: MenuOption[]
          value: string
          onSelect: (value: string) => void
      }

interface FlyoutMenuProps {
    items: FlyoutMenuItem[]
    /** The trigger. Pass a function to style it while the menu is open. */
    children: React.ReactNode | ((open: boolean) => React.ReactNode)
    /** Gap between the trigger and the menu */
    offset?: number
}

const cardBase =
    'rounded-[20px] p-1.5 bg-white/95 dark:bg-[#141416]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl'
const rowBase =
    'w-full flex items-center gap-3 rounded-xl px-2 py-1.5 text-left text-[14px] font-medium text-neutral-800 dark:text-neutral-100 transition-colors duration-100 cursor-pointer'
const rowHover = 'hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
const rowActive = 'bg-black/[0.05] dark:bg-white/[0.08]'
const badge =
    'w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-black/[0.05] dark:bg-white/[0.08] text-neutral-600 dark:text-neutral-300'

export function FlyoutMenu({ items, children, offset = 12 }: FlyoutMenuProps) {
    const [open, setOpen] = React.useState(false)
    const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null)
    const [activeSub, setActiveSub] = React.useState<string | null>(null)

    const triggerRef = React.useRef<HTMLDivElement>(null)
    const menuRef = React.useRef<HTMLDivElement>(null)
    const subTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    const close = React.useCallback(() => {
        setOpen(false)
        setActiveSub(null)
    }, [])

    const clearSubTimer = () => {
        if (subTimer.current) clearTimeout(subTimer.current)
    }

    const openSub = (id: string) => {
        clearSubTimer()
        setActiveSub(id)
    }

    // small grace period so a slightly wobbly mouse path never kills the submenu
    const closeSub = (id: string) => {
        clearSubTimer()
        subTimer.current = setTimeout(() => {
            setActiveSub((cur) => (cur === id ? null : cur))
        }, 120)
    }

    // Menu sits to the right of the trigger, grows upward from its bottom edge,
    // and is clamped so it never leaves the viewport.
    React.useLayoutEffect(() => {
        if (!open) {
            setPos(null)
            return
        }
        const trigger = triggerRef.current
        const menu = menuRef.current
        if (!trigger || !menu) return

        const r = trigger.getBoundingClientRect()
        const h = menu.offsetHeight
        const margin = 12
        const top = Math.min(Math.max(r.bottom - h, margin), window.innerHeight - h - margin)
        setPos({ top, left: r.right + offset })
    }, [open, offset])

    // outside click, Escape, resize
    React.useEffect(() => {
        if (!open) return
        const onDown = (e: PointerEvent) => {
            const target = e.target as Node
            if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
            close()
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close()
        }
        // capture phase so the canvas can't swallow the event first
        document.addEventListener('pointerdown', onDown, true)
        document.addEventListener('keydown', onKey)
        window.addEventListener('resize', close)
        return () => {
            document.removeEventListener('pointerdown', onDown, true)
            document.removeEventListener('keydown', onKey)
            window.removeEventListener('resize', close)
        }
    }, [open, close])

    React.useEffect(() => clearSubTimer, [])

    const renderItem = (item: FlyoutMenuItem) => {
        if (item.type === 'divider') {
            return <div key={item.id} className='h-px mx-1 my-1.5 bg-black/[0.08] dark:bg-white/[0.08]' />
        }

        const Icon = item.icon

        if (item.type === 'toggle') {
            return (
                <button
                    key={item.id}
                    type='button'
                    role='menuitemcheckbox'
                    aria-checked={item.checked}
                    onMouseEnter={() => {
                        clearSubTimer()
                        setActiveSub(null)
                    }}
                    onClick={() => item.onChange(!item.checked)}
                    className={cn(rowBase, rowHover)}
                >
                    <span className={badge}>
                        <Icon className='w-4 h-4' strokeWidth={1.8} />
                    </span>
                    <span className='flex-1'>{item.label}</span>
                    {item.checked && <Check className='w-4 h-4 shrink-0' strokeWidth={2} />}
                </button>
            )
        }

        const isOpen = activeSub === item.id
        return (
            <div
                key={item.id}
                className='relative'
                onMouseEnter={() => openSub(item.id)}
                onMouseLeave={() => closeSub(item.id)}
            >
                <button
                    type='button'
                    role='menuitem'
                    aria-haspopup='menu'
                    aria-expanded={isOpen}
                    onClick={() => openSub(item.id)}
                    className={cn(rowBase, rowHover, isOpen && rowActive)}
                >
                    <span className={badge}>
                        <Icon className='w-4 h-4' strokeWidth={1.8} />
                    </span>
                    <span className='flex-1'>{item.label}</span>
                    <ChevronRight className='w-4 h-4 shrink-0 text-neutral-400' strokeWidth={1.8} />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <div key='flyout' className='absolute top-[-6px] left-full pl-3.5'>
                            <motion.div
                                role='menu'
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -4 }}
                                transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                                className={cn(cardBase, 'w-[200px]')}
                            >
                                {item.options.map((opt) => {
                                    const OptIcon = opt.icon
                                    const active = opt.value === item.value
                                    return (
                                        <button
                                            key={opt.value}
                                            type='button'
                                            role='menuitemradio'
                                            aria-checked={active}
                                            onClick={() => {
                                                item.onSelect(opt.value)
                                                close()
                                            }}
                                            className={cn(rowBase, rowHover, active && rowActive)}
                                        >
                                            <span className={badge}>
                                                <OptIcon className='w-4 h-4' strokeWidth={1.8} />
                                            </span>
                                            <span className='flex-1'>{opt.label}</span>
                                            {active && <Check className='w-4 h-4 shrink-0' strokeWidth={2} />}
                                        </button>
                                    )
                                })}
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        )
    }

    return (
        <>
            <div ref={triggerRef} className='flex' onClick={() => setOpen((o) => !o)}>
                {typeof children === 'function' ? children(open) : children}
            </div>

            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {open && (
                            <motion.div
                                ref={menuRef}
                                role='menu'
                                initial={{ opacity: 0, x: -8, scale: 0.97 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -4, scale: 0.98 }}
                                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                                style={{
                                    top: pos?.top ?? 0,
                                    left: pos?.left ?? 0,
                                    visibility: pos ? 'visible' : 'hidden',
                                }}
                                className={cn('fixed z-[100] w-[260px] origin-bottom-left', cardBase)}
                            >
                                {items.map(renderItem)}
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </>
    )
}

export default FlyoutMenu
