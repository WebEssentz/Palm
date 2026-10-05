'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Folder, Search } from 'lucide-react'
import { FolderOptionItem } from './types'

interface MoveToFolderPopoverProps {
    isOpen: boolean
    onClose: () => void
    folders: FolderOptionItem[]
    onSelectFolder: (folderId: string | null) => void
    isLight: boolean
    text: string
    muted: string
    border: string
}

export default function MoveToFolderPopover({
    isOpen,
    onClose,
    folders,
    onSelectFolder,
    isLight,
    text,
    muted,
    border,
}: MoveToFolderPopoverProps) {
    const [search, setSearch] = useState('')
    const popoverRef = useRef<HTMLDivElement>(null)

    // Click outside to dismiss
    useEffect(() => {
        if (!isOpen) return
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    const filtered = folders.filter((f) =>
        f.name.toLowerCase().includes(search.trim().toLowerCase())
    )

    return (
        <AnimatePresence>
            <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 12px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 260,
                    borderRadius: 14,
                    background: isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(22, 22, 22, 0.92)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'}`,
                    boxShadow: isLight
                        ? '0 12px 32px -4px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.06)'
                        : '0 16px 40px -4px rgba(0,0,0,0.65), 0 6px 16px rgba(0,0,0,0.4)',
                    padding: '10px 8px',
                    zIndex: 1000,
                    boxSizing: 'border-box',
                }}
            >
                {/* Header label */}
                <div style={{ padding: '6px 10px 8px', display: 'flex', alignItems: 'center' }}>
                    <span
                        style={{
                            fontSize: 13,
                            fontWeight: 600,
                            letterSpacing: '-0.01em',
                            color: text,
                        }}
                    >
                        Move to folder
                    </span>
                </div>

                {/* Compact search input if more than 3 folders */}
                {folders.length > 3 && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '5px 8px',
                            borderRadius: 8,
                            background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                            marginBottom: 6,
                        }}
                    >
                        <Search style={{ width: 13, height: 13, color: muted, flexShrink: 0 }} />
                        <input
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Find folder…"
                            style={{
                                width: '100%',
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                fontSize: 12,
                                color: text,
                            }}
                        />
                    </div>
                )}

                {/* Folder options list */}
                <div
                    style={{
                        maxHeight: 180,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        scrollbarWidth: 'thin',
                    }}
                >
                    {filtered.length === 0 ? (
                        <div style={{ padding: '12px 8px', textAlign: 'center', fontSize: 12, color: muted }}>
                            No folders found
                        </div>
                    ) : (
                        filtered.map((f) => (
                            <button
                                key={f._id}
                                type="button"
                                onClick={() => {
                                    onSelectFolder(f._id)
                                    onClose()
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '7px 8px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: 'transparent',
                                    color: text,
                                    fontSize: 13,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    width: '100%',
                                    transition: 'background 0.12s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent'
                                }}
                            >
                                <Folder style={{ width: 14, height: 14, color: muted, flexShrink: 0 }} />
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {f.name}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
