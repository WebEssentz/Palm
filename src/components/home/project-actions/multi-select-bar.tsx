'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Copy,
    FolderInput,
    Pin,
    Trash2,
    X,
    CheckSquare,
} from 'lucide-react'
import MoveToFolderPopover from './move-to-folder-popover'
import DeleteConfirmationModal from './delete-confirmation-modal'
import { FolderOptionItem } from './types'
import { useAppSelector } from '@/redux/store'

interface MultiSelectBarProps {
    selectedIds: string[]
    onDeselectAll: () => void
    onDuplicate: () => Promise<void> | void
    onMoveToFolder: (folderId: string | null) => Promise<void> | void
    onTogglePin: () => Promise<void> | void
    onDelete: () => Promise<void> | void
    isAllPinned: boolean
    folders: FolderOptionItem[]
    isLight: boolean
    text: string
    muted: string
    border: string
}

export default function MultiSelectBar({
    selectedIds,
    onDeselectAll,
    onDuplicate,
    onMoveToFolder,
    onTogglePin,
    onDelete,
    isAllPinned,
    folders,
    isLight,
    text,
    muted,
    border,
}: MultiSelectBarProps) {
    const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isDuplicating, setIsDuplicating] = useState(false)
    const [isPinning, setIsPinning] = useState(false)

    const sideOpen = useAppSelector(s => s.ui.sidebarOpen)
    const sidebarWidth = sideOpen ? 260 : 52

    const count = selectedIds.length

    const handleDuplicate = async () => {
        setIsDuplicating(true)
        try {
            await onDuplicate()
        } finally {
            setIsDuplicating(false)
        }
    }

    const handleTogglePin = async () => {
        setIsPinning(true)
        try {
            await onTogglePin()
        } finally {
            setIsPinning(false)
        }
    }

    const btnStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        height: 34,
        padding: '0 12px',
        borderRadius: 9,
        border: 'none',
        background: 'transparent',
        color: text,
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 0.14s ease, color 0.14s ease, transform 0.08s ease',
    }

    return (
        <>
            <motion.div
                animate={{ left: sidebarWidth }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    position: 'fixed',
                    bottom: 28,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    pointerEvents: 'none',
                    zIndex: 9000,
                }}
            >
                <AnimatePresence>
                    {count > 0 && (
                        <motion.div
                            key="multi-select-bar"
                            initial={{ opacity: 0, y: 32, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 24, scale: 0.95 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                                pointerEvents: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 8px',
                                borderRadius: 16,
                                background: isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(20, 20, 20, 0.85)',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'}`,
                                boxShadow: isLight
                                    ? '0 16px 40px -8px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.06)'
                                    : '0 20px 48px -8px rgba(0,0,0,0.7), 0 6px 20px rgba(0,0,0,0.4)',
                            }}
                        >
                        {/* ── Selection Count Pill ── */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 7,
                                height: 34,
                                padding: '0 12px 0 10px',
                                borderRadius: 9,
                                background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                                color: text,
                                fontSize: 13,
                                fontWeight: 600,
                                letterSpacing: '-0.01em',
                                marginRight: 4,
                            }}
                        >
                            <CheckSquare style={{ width: 15, height: 15, color: muted }} />
                            <span>{count} selected</span>
                        </div>

                        {/* ── Duplicate ── */}
                        <button
                            type="button"
                            onClick={handleDuplicate}
                            disabled={isDuplicating}
                            style={btnStyle}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                            }}
                        >
                            <Copy style={{ width: 14, height: 14, color: muted }} />
                            <span>{isDuplicating ? 'Duplicating…' : 'Duplicate'}</span>
                        </button>

                        {/* ── Move to Folder (with Popover anchored directly) ── */}
                        <div style={{ position: 'relative' }}>
                            <button
                                type="button"
                                disabled={folders.length === 0}
                                onClick={() => {
                                    if (folders.length > 0) setIsFolderMenuOpen(!isFolderMenuOpen)
                                }}
                                style={{
                                    ...btnStyle,
                                    opacity: folders.length === 0 ? 0.45 : 1,
                                    cursor: folders.length === 0 ? 'not-allowed' : 'pointer',
                                    background: isFolderMenuOpen
                                        ? (isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)')
                                        : 'transparent',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isFolderMenuOpen && folders.length > 0) {
                                        e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isFolderMenuOpen) {
                                        e.currentTarget.style.background = 'transparent'
                                    }
                                }}
                            >
                                <FolderInput style={{ width: 15, height: 15, color: muted }} />
                                <span>Move to folder</span>
                            </button>

                            <MoveToFolderPopover
                                isOpen={isFolderMenuOpen}
                                onClose={() => setIsFolderMenuOpen(false)}
                                folders={folders}
                                onSelectFolder={(folderId) => {
                                    onMoveToFolder(folderId)
                                    setIsFolderMenuOpen(false)
                                }}
                                isLight={isLight}
                                text={text}
                                muted={muted}
                                border={border}
                            />
                        </div>

                    {/* ── Pin to Sidebar ── */}
                    <button
                        type="button"
                        onClick={handleTogglePin}
                        disabled={isPinning}
                        style={btnStyle}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                        }}
                    >
                        <Pin
                            style={{
                                width: 14,
                                height: 14,
                                color: isAllPinned ? (isLight ? '#000' : '#fff') : muted,
                                transform: isAllPinned ? 'rotate(45deg)' : 'none',
                                transition: 'transform 0.15s ease',
                            }}
                        />
                        <span>{isAllPinned ? 'Unpin from Sidebar' : 'Pin to Sidebar'}</span>
                    </button>

                    {/* ── Delete Button ── */}
                    <button
                        type="button"
                        onClick={() => setIsDeleteModalOpen(true)}
                        aria-label="Delete selected projects"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 34,
                            height: 34,
                            borderRadius: 9,
                            border: 'none',
                            background: 'transparent',
                            color: isLight ? '#dc2626' : '#f87171',
                            cursor: 'pointer',
                            transition: 'background 0.14s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = isLight ? 'rgba(220, 38, 38, 0.08)' : 'rgba(248, 113, 113, 0.12)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                        }}
                    >
                        <Trash2 style={{ width: 15, height: 15 }} />
                    </button>

                    {/* Vertical separator */}
                    <div
                        style={{
                            width: 1,
                            height: 18,
                            background: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)',
                            margin: '0 2px',
                        }}
                    />

                    {/* ── Deselect / Close ── */}
                    <button
                        type="button"
                        onClick={onDeselectAll}
                        aria-label="Deselect all"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: 'none',
                            background: 'transparent',
                            color: muted,
                            cursor: 'pointer',
                            transition: 'color 0.14s ease, background 0.14s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = text
                            e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = muted
                            e.currentTarget.style.background = 'transparent'
                        }}
                    >
                        <X style={{ width: 15, height: 15 }} />
                    </button>
                </motion.div>
                )}
            </AnimatePresence>
            </motion.div>

            {/* ── Delete Confirmation Modal ── */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                count={count}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={async () => {
                    await onDelete()
                    setIsDeleteModalOpen(false)
                }}
                isLight={isLight}
            />
        </>
    )
}
