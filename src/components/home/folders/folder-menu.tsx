'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Smile, Pencil, Trash2, ChevronRight } from 'lucide-react'

export const FOLDER_EMOJIS = [
    '📁', '⭐', '🔥', '🚀', '🎨', '🎬',
    '📷', '🎵', '💡', '🧪', '🛠️', '📦',
    '🎯', '💎', '🌈', '🌿', '🌊', '☀️',
    '🌙', '⚡', '❤️', '💜', '💙', '💚',
    '🧡', '💛', '🏠', '🏢', '🛒', '👗',
    '🎮', '🐝', '🦊', '🐙', '🧠', '✨',
]

export const FOLDER_COLORS = [
    { label: 'Red',    value: '#ef4444' },
    { label: 'Orange', value: '#f97316' },
    { label: 'Yellow', value: '#eab308' },
    { label: 'Green',  value: '#10b981' },
    { label: 'Cyan',   value: '#06b6d4' },
    { label: 'Purple', value: '#a855f7' },
    { label: 'Slate',  value: '#475569' },
]

interface FolderMenuProps {
    isOpen: boolean
    /** Trigger button used to anchor this portaled menu */
    triggerElement: HTMLButtonElement | null
    onClose: () => void
    onOpenRename: () => void
    onOpenDelete: () => void
    onSelectColor: (color: string | undefined) => void
    onSelectEmoji: (emoji: string | undefined) => void
    currentColor?: string
    currentEmoji?: string
    isLight?: boolean
}

export function FolderMenu({
    isOpen,
    triggerElement,
    onClose,
    onOpenRename,
    onOpenDelete,
    onSelectColor,
    onSelectEmoji,
    currentColor,
    currentEmoji,
    isLight = false,
}: FolderMenuProps) {
    const [activeSubmenu, setActiveSubmenu] = useState<'color' | 'emoji' | null>(null)
    const [pos, setPos] = useState({ top: 0, right: 0 })
    const [mounted, setMounted] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => { setMounted(true) }, [])

    // Recalculate position whenever the menu opens
    useEffect(() => {
        if (!isOpen || !triggerElement) return
        const rect = triggerElement.getBoundingClientRect()
        setPos({
            top: rect.bottom + 6,
            right: window.innerWidth - rect.right,
        })
    }, [isOpen, triggerElement])

    // Reset submenu when closed
    useEffect(() => {
        if (!isOpen) setActiveSubmenu(null)
    }, [isOpen])

    const handleClickOutside = useCallback((e: MouseEvent) => {
        if (
            menuRef.current &&
            !menuRef.current.contains(e.target as Node) &&
            !triggerElement?.contains(e.target as Node)
        ) {
            onClose()
        }
    }, [onClose, triggerElement])

    useEffect(() => {
        if (!isOpen) return
        // Delay so the click that opened the menu doesn't immediately close it
        const t = setTimeout(() => {
            window.addEventListener('mousedown', handleClickOutside)
        }, 0)
        return () => {
            clearTimeout(t)
            window.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, handleClickOutside])

    if (!mounted) return null

    const bg = isLight ? '#ffffff' : '#141414'
    const border = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.09)'
    const itemColor = isLight ? '#000000' : '#ffffff'
    const hoverBg = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)'

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div
                    ref={menuRef}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'fixed',
                        top: pos.top,
                        right: pos.right,
                        zIndex: 99000,
                    }}
                >
                    {/* ── Emoji Submenu (opens to the left of main menu) ── */}
                    <AnimatePresence>
                        {activeSubmenu === 'emoji' && (
                            <motion.div
                                initial={{ opacity: 0, x: 8, scale: 0.96 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 8, scale: 0.96 }}
                                transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    right: 'calc(100% + 8px)',
                                    borderRadius: 14,
                                    background: bg,
                                    border: `1px solid ${border}`,
                                    boxShadow: isLight
                                        ? '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)'
                                        : '0 16px 48px rgba(0,0,0,0.55)',
                                    padding: '10px',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(6, 32px)',
                                    gap: 4,
                                    zIndex: 99010,
                                }}
                            >
                                {FOLDER_EMOJIS.map((emoji) => {
                                    const isSelected = currentEmoji === emoji
                                    return (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => {
                                                onSelectEmoji(isSelected ? undefined : emoji)
                                                onClose()
                                            }}
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 7,
                                                border: 'none',
                                                background: isSelected
                                                    ? (isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)')
                                                    : 'transparent',
                                                fontSize: 16,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                padding: 0,
                                                transition: 'background 0.1s ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = isLight
                                                    ? 'rgba(0,0,0,0.06)'
                                                    : 'rgba(255,255,255,0.09)'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = isSelected
                                                    ? (isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)')
                                                    : 'transparent'
                                            }}
                                        >
                                            {emoji}
                                        </button>
                                    )
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Color Submenu (opens to the left of main menu) ── */}
                    <AnimatePresence>
                        {activeSubmenu === 'color' && (
                            <motion.div
                                initial={{ opacity: 0, x: 8, scale: 0.96 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 8, scale: 0.96 }}
                                transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                                style={{
                                    position: 'absolute',
                                    top: 40,
                                    right: 'calc(100% + 8px)',
                                    borderRadius: 14,
                                    background: bg,
                                    border: `1px solid ${border}`,
                                    boxShadow: isLight
                                        ? '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)'
                                        : '0 16px 48px rgba(0,0,0,0.55)',
                                    padding: '7px 12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 9,
                                    zIndex: 99010,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {/* None */}
                                <button
                                    type="button"
                                    onClick={() => { onSelectColor(undefined); onClose() }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        padding: '4px 6px',
                                        fontSize: 12.5,
                                        fontWeight: 500,
                                        color: !currentColor ? itemColor : (isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'),
                                        cursor: 'pointer',
                                        borderRadius: 6,
                                        transition: 'color 0.1s ease',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = itemColor }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = !currentColor
                                            ? itemColor
                                            : (isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)')
                                    }}
                                >
                                    None
                                </button>

                                {/* Color swatches */}
                                {FOLDER_COLORS.map((c) => {
                                    const isSelected = currentColor === c.value
                                    return (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => { onSelectColor(c.value); onClose() }}
                                            aria-label={c.label}
                                            style={{
                                                width: 18,
                                                height: 18,
                                                borderRadius: '50%',
                                                background: c.value,
                                                border: isSelected
                                                    ? `2px solid ${itemColor}`
                                                    : '1.5px solid rgba(255,255,255,0.2)',
                                                boxShadow: isSelected ? '0 0 0 1px rgba(0,0,0,0.35)' : 'none',
                                                cursor: 'pointer',
                                                padding: 0,
                                                flexShrink: 0,
                                                transition: 'transform 0.12s ease',
                                                transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)' }}
                                            onMouseLeave={(e) => { e.currentTarget.style.transform = isSelected ? 'scale(1.15)' : 'scale(1)' }}
                                        />
                                    )
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Main Context Menu ── */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            width: 182,
                            borderRadius: 14,
                            background: bg,
                            border: `1px solid ${border}`,
                            boxShadow: isLight
                                ? '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)'
                                : '0 16px 48px rgba(0,0,0,0.55)',
                            padding: '6px',
                            boxSizing: 'border-box',
                        }}
                    >
                        {/* Color */}
                        <button
                            type="button"
                            onMouseEnter={() => setActiveSubmenu('color')}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 10px',
                                borderRadius: 8,
                                border: 'none',
                                background: activeSubmenu === 'color' ? hoverBg : 'transparent',
                                color: itemColor,
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'background 0.1s ease',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <Palette style={{ width: 14, height: 14, opacity: 0.75 }} />
                                <span>Color</span>
                            </div>
                            <ChevronRight style={{ width: 13, height: 13, opacity: 0.45 }} />
                        </button>

                        {/* Emoji */}
                        <button
                            type="button"
                            onMouseEnter={() => setActiveSubmenu('emoji')}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 10px',
                                borderRadius: 8,
                                border: 'none',
                                background: activeSubmenu === 'emoji' ? hoverBg : 'transparent',
                                color: itemColor,
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'background 0.1s ease',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <Smile style={{ width: 14, height: 14, opacity: 0.75 }} />
                                <span>Emoji</span>
                            </div>
                            <ChevronRight style={{ width: 13, height: 13, opacity: 0.45 }} />
                        </button>

                        {/* Rename */}
                        <button
                            type="button"
                            onMouseEnter={(e) => {
                                setActiveSubmenu(null)
                                e.currentTarget.style.background = hoverBg
                            }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                            onClick={() => { onClose(); onOpenRename() }}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 9,
                                padding: '8px 10px',
                                borderRadius: 8,
                                border: 'none',
                                background: 'transparent',
                                color: itemColor,
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'background 0.1s ease',
                            }}
                        >
                            <Pencil style={{ width: 14, height: 14, opacity: 0.75 }} />
                            <span>Rename folder</span>
                        </button>

                        {/* Divider */}
                        <div
                            style={{
                                height: 1,
                                background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)',
                                margin: '4px 6px',
                            }}
                        />

                        {/* Delete */}
                        <button
                            type="button"
                            onMouseEnter={(e) => {
                                setActiveSubmenu(null)
                                e.currentTarget.style.background = isLight
                                    ? 'rgba(239,68,68,0.07)'
                                    : 'rgba(239,68,68,0.12)'
                            }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                            onClick={() => { onClose(); onOpenDelete() }}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 9,
                                padding: '8px 10px',
                                borderRadius: 8,
                                border: 'none',
                                background: 'transparent',
                                color: '#f87171',
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'background 0.1s ease',
                            }}
                        >
                            <Trash2 style={{ width: 14, height: 14, color: '#f87171' }} />
                            <span>Delete folder</span>
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}
