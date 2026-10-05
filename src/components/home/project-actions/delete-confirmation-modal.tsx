'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Info } from 'lucide-react'

interface DeleteConfirmationModalProps {
    isOpen: boolean
    count: number
    onClose: () => void
    onConfirm: () => Promise<void> | void
    isLight: boolean
}

export default function DeleteConfirmationModal({
    isOpen,
    count,
    onClose,
    onConfirm,
    isLight,
}: DeleteConfirmationModalProps) {
    const [mounted, setMounted] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isDeleting) onClose()
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose, isDeleting])

    if (!mounted || !isOpen) return null

    const handleConfirm = async () => {
        setIsDeleting(true)
        try {
            await onConfirm()
            onClose()
        } catch (err) {
            console.error('Delete failed', err)
        } finally {
            setIsDeleting(false)
        }
    }

    const modalContent = (
        <AnimatePresence>
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {/* ── Sleek Blur Backdrop ── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => {
                        if (!isDeleting) onClose()
                    }}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: isLight ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                    }}
                />

                {/* ── Modal Card (matching Image 3) ── */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: 8 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        position: 'relative',
                        zIndex: 10,
                        width: '100%',
                        maxWidth: 380,
                        margin: '0 20px',
                        background: isLight ? '#ffffff' : '#141414',
                        border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 18,
                        boxShadow: isLight
                            ? '0 24px 48px -12px rgba(0,0,0,0.2), 0 8px 24px -4px rgba(0,0,0,0.08)'
                            : '0 24px 60px -12px rgba(0,0,0,0.8), 0 8px 24px -4px rgba(0,0,0,0.6)',
                        padding: '24px 24px 20px',
                        boxSizing: 'border-box',
                    }}
                >
                    {/* Info Circle Icon */}
                    <div
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 14,
                        }}
                    >
                        <Info
                            style={{
                                width: 16,
                                height: 16,
                                color: isLight ? '#0a0a0a' : '#ffffff',
                            }}
                        />
                    </div>

                    {/* Title */}
                    <h2
                        style={{
                            fontSize: 16,
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                            margin: '0 0 6px',
                            color: isLight ? '#0a0a0a' : '#ffffff',
                        }}
                    >
                        Delete {count} {count === 1 ? 'project' : 'projects'}?
                    </h2>

                    {/* Description */}
                    <p
                        style={{
                            fontSize: 13,
                            color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
                            margin: '0 0 24px',
                            lineHeight: 1.45,
                        }}
                    >
                        These projects will be moved to the trash.
                    </p>

                    {/* Buttons Row */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 10,
                        }}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isDeleting}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: isLight ? '#0a0a0a' : '#ffffff',
                                fontSize: 13,
                                fontWeight: 550,
                                padding: '8px 14px',
                                borderRadius: 8,
                                cursor: isDeleting ? 'not-allowed' : 'pointer',
                                transition: 'background 0.12s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                            }}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={isDeleting}
                            style={{
                                background: isLight ? '#0a0a0a' : '#ffffff',
                                color: isLight ? '#ffffff' : '#0a0a0a',
                                border: 'none',
                                fontSize: 13,
                                fontWeight: 600,
                                padding: '8px 18px',
                                borderRadius: 10,
                                cursor: isDeleting ? 'not-allowed' : 'pointer',
                                opacity: isDeleting ? 0.7 : 1,
                                transition: 'opacity 0.12s ease',
                            }}
                        >
                            {isDeleting ? 'Deleting…' : 'Delete'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )

    return createPortal(modalContent, document.body)
}
