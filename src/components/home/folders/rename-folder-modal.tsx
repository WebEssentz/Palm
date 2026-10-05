'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface RenameFolderModalProps {
    isOpen: boolean
    currentName: string
    onClose: () => void
    onRename: (newName: string) => Promise<void> | void
    isLight?: boolean
}

export function RenameFolderModal({
    isOpen,
    currentName,
    onClose,
    onRename,
    isLight = false,
}: RenameFolderModalProps) {
    const [name, setName] = useState(currentName)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [mounted, setMounted] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen) {
            setName(currentName)
            setTimeout(() => {
                inputRef.current?.focus()
                inputRef.current?.select()
            }, 60)
        }
    }, [isOpen, currentName])

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()
        const trimmed = name.trim()
        if (!trimmed || isSubmitting) return

        setIsSubmitting(true)
        try {
            await onRename(trimmed)
            onClose()
        } catch (err) {
            console.error('Failed to rename folder', err)
        } finally {
            setIsSubmitting(false)
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

                    {/* Dialog Card matching Image 4 */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: 380,
                            borderRadius: 14,
                            background: isLight ? '#ffffff' : '#141414',
                            border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                            boxShadow: '0 20px 48px rgba(0,0,0,0.5)',
                            padding: '20px 22px 22px',
                            boxSizing: 'border-box',
                            zIndex: 1,
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 16,
                            }}
                        >
                            <h2
                                style={{
                                    margin: 0,
                                    fontSize: 15,
                                    fontWeight: 650,
                                    color: isLight ? '#000000' : '#ffffff',
                                    letterSpacing: '-0.015em',
                                }}
                            >
                                Rename Folder
                            </h2>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 4,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
                                    borderRadius: 6,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = isLight ? '#000000' : '#ffffff'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'
                                }}
                            >
                                <X style={{ width: 16, height: 16 }} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Folder name"
                                style={{
                                    width: '100%',
                                    height: 38,
                                    padding: '0 12px',
                                    fontSize: 13.5,
                                    borderRadius: 8,
                                    border: `1px solid ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)'}`,
                                    background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.06)',
                                    color: isLight ? '#000000' : '#ffffff',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    marginBottom: 16,
                                    transition: 'border-color 0.15s ease',
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = isLight ? '#000000' : 'rgba(255,255,255,0.4)'
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)'
                                }}
                            />

                            <button
                                type="submit"
                                disabled={!name.trim() || isSubmitting}
                                style={{
                                    width: '100%',
                                    height: 38,
                                    borderRadius: 8,
                                    border: 'none',
                                    background: isLight ? '#000000' : '#ffffff',
                                    color: isLight ? '#ffffff' : '#000000',
                                    fontSize: 13.5,
                                    fontWeight: 600,
                                    cursor: name.trim() ? 'pointer' : 'not-allowed',
                                    opacity: name.trim() && !isSubmitting ? 1 : 0.5,
                                    transition: 'opacity 0.15s ease',
                                }}
                            >
                                {isSubmitting ? 'Saving…' : 'Save'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}
