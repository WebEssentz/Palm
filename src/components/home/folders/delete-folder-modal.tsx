'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Info } from 'lucide-react'

interface DeleteFolderModalProps {
    isOpen: boolean
    folderName: string
    onClose: () => void
    onConfirm: () => Promise<void> | void
    isLight?: boolean
}

export function DeleteFolderModal({
    isOpen,
    folderName,
    onClose,
    onConfirm,
    isLight = false,
}: DeleteFolderModalProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleDelete = async () => {
        if (isDeleting) return
        setIsDeleting(true)
        try {
            await onConfirm()
            onClose()
        } catch (err) {
            console.error('Failed to delete folder', err)
        } finally {
            setIsDeleting(false)
        }
    }

    if (!mounted) return null

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 999999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                    }}
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.65)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                        }}
                    />

                    {/* Dialog Card matching Image 5 */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: 420,
                            borderRadius: 16,
                            background: isLight ? '#ffffff' : '#141414',
                            border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                            boxShadow: '0 24px 50px rgba(0,0,0,0.55)',
                            padding: '24px 24px 20px',
                            boxSizing: 'border-box',
                            zIndex: 1,
                        }}
                    >
                        {/* Info Icon */}
                        <div
                            style={{
                                width: 22,
                                height: 22,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)',
                                marginBottom: 14,
                            }}
                        >
                            <Info style={{ width: 20, height: 20, strokeWidth: 1.8 }} />
                        </div>

                        {/* Title */}
                        <h2
                            style={{
                                margin: '0 0 6px',
                                fontSize: 16.5,
                                fontWeight: 650,
                                color: isLight ? '#000000' : '#ffffff',
                                letterSpacing: '-0.015em',
                            }}
                        >
                            Delete {folderName}?
                        </h2>

                        {/* Description */}
                        <p
                            style={{
                                margin: '0 0 24px',
                                fontSize: 13.5,
                                color: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.55)',
                                lineHeight: 1.45,
                                letterSpacing: '-0.005em',
                            }}
                        >
                            The folder and its projects can be restored from Trash.
                        </p>

                        {/* Action Buttons */}
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
                                style={{
                                    padding: '7px 14px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: 'transparent',
                                    color: isLight ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.8)',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = isLight ? '#000000' : '#ffffff'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = isLight ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.8)'
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                style={{
                                    padding: '7px 18px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: isLight ? '#000000' : '#ffffff',
                                    color: isLight ? '#ffffff' : '#000000',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                                    opacity: isDeleting ? 0.6 : 1,
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                    transition: 'opacity 0.15s ease',
                                }}
                            >
                                {isDeleting ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}
