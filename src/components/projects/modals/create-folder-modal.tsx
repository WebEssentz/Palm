'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface CreateFolderModalProps {
    isOpen: boolean
    onClose: () => void
    onCreate: (folderName: string) => void
    isLight: boolean
    text: string
    muted: string
    border: string
}

export function CreateFolderModal({
    isOpen,
    onClose,
    onCreate,
    isLight,
    text,
    muted,
    border,
}: CreateFolderModalProps) {
    const [mounted, setMounted] = useState(false)
    const [name, setName] = useState('Untitled Folder 1')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen) {
            setName('Untitled Folder 1')
            setTimeout(() => {
                inputRef.current?.focus()
                inputRef.current?.select()
            }, 50)
        }
    }, [isOpen])

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault()
        if (name.trim()) {
            onCreate(name.trim())
            onClose()
        }
    }

    if (!mounted || typeof document === 'undefined') return null

    return createPortal(
        <AnimatePresence>
            {isOpen && (
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
                    {/* Sleek deep frosted backdrop covering entire viewport including sidebar */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: isLight ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.78)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                        }}
                    />

                    {/* Modal Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 400 }}
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: 380,
                            margin: '0 16px',
                            background: isLight ? '#ffffff' : '#1c1c1e',
                            borderRadius: 14,
                            border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'}`,
                            boxShadow: isLight
                                ? '0 20px 40px rgba(0,0,0,0.15)'
                                : '0 25px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
                            overflow: 'hidden',
                            zIndex: 100000,
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '14px 18px 12px',
                            }}
                        >
                            <span style={{ fontSize: 14, fontWeight: 600, color: text, letterSpacing: '-0.01em' }}>
                                Create New Folder
                            </span>
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: muted,
                                    padding: 4,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 6,
                                }}
                                onMouseEnter={e => (e.currentTarget.style.color = text)}
                                onMouseLeave={e => (e.currentTarget.style.color = muted)}
                            >
                                <X style={{ width: 14, height: 14 }} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} style={{ padding: '0 18px 18px' }}>
                            <div style={{ marginBottom: 14 }}>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Folder name"
                                    style={{
                                        width: '100%',
                                        height: 38,
                                        padding: '0 12px',
                                        fontSize: 13,
                                        borderRadius: 8,
                                        border: `1px solid ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)'}`,
                                        background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
                                        color: text,
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        transition: 'border-color 0.15s ease',
                                    }}
                                    onFocus={e => (e.currentTarget.style.borderColor = isLight ? '#000' : 'rgba(255,255,255,0.4)')}
                                    onBlur={e => (e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)')}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!name.trim()}
                                style={{
                                    width: '100%',
                                    height: 36,
                                    borderRadius: 8,
                                    background: isLight ? '#000000' : '#ffffff',
                                    color: isLight ? '#ffffff' : '#000000',
                                    border: 'none',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: name.trim() ? 'pointer' : 'not-allowed',
                                    opacity: name.trim() ? 1 : 0.45,
                                    transition: 'opacity 0.15s ease',
                                }}
                            >
                                Create
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}
