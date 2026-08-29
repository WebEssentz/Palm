'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { ArrowUp, Globe, X, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { AttachmentMenu } from '@/components/home/attachment-menu'
import { ImagePreview, type ImageItem } from '@/components/home/image-preview'

interface Props {
    onSend: (message: string, opts?: { urls?: string[]; imageStorageIds?: string[] }) => void
    isLoading?: boolean
    attachedFrameId?: string | null
    attachedFrameName?: string | null
    attachedThumbnailUrl?: string | null
    onDetachFrame?: () => void
}

export function ChatInput({ onSend, isLoading, attachedFrameId, attachedFrameName, attachedThumbnailUrl, onDetachFrame }: Props) {
    const [message, setMessage] = useState('')
    const [isExpanded, setIsExpanded] = useState(false)
    const [uploadedImages, setUploadedImages] = useState<ImageItem[]>([])
    const [urlTags, setUrlTags] = useState<string[]>([])
    const [urlMode, setUrlMode] = useState(false)
    const [urlInputValue, setUrlInputValue] = useState('')
    const [isDragging, setIsDragging] = useState(false)
    const collapsedRef = useRef<HTMLTextAreaElement>(null)
    const expandedRef = useRef<HTMLTextAreaElement>(null)
    const dragCounter = useRef(0)
    const { theme, systemTheme } = useTheme()
    const isLight = (theme === 'system' ? systemTheme : theme) === 'light'

    useEffect(() => {
        if (attachedFrameId) {
            setIsExpanded(true)
            setTimeout(() => expandedRef.current?.focus(), 50)
        }
    }, [attachedFrameId])

    useEffect(() => {
        if (isExpanded && expandedRef.current) {
            const el = expandedRef.current
            el.value = message
            el.focus()
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 140) + 'px'
            el.selectionStart = el.selectionEnd = el.value.length
        }
    }, [isExpanded])

    const handleUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) return
        setIsExpanded(true)
        setTimeout(() => expandedRef.current?.focus(), 50)
        const previewUrl = URL.createObjectURL(file)
        const id = Math.random().toString(36).slice(2, 9)
        setUploadedImages(prev => [...prev, { id, previewUrl, storageId: null }])
        try {
            const form = new FormData()
            form.append('file', file)
            const res = await fetch('/api/upload', { method: 'POST', body: form })
            if (!res.ok) throw new Error('Upload failed')
            const { storageId } = await res.json()
            setUploadedImages(prev => prev.map(img => img.id === id ? { ...img, storageId } : img))
        } catch (err) {
            console.error('Upload error:', err)
            setUploadedImages(prev => prev.map(img => img.id === id ? { ...img, error: true } : img))
        }
    }

    const handleRemoveImage = (id: string) => {
        setUploadedImages(prev => {
            const img = prev.find(i => i.id === id)
            if (img) {
                URL.revokeObjectURL(img.previewUrl)
                if (img.storageId) fetch('/api/files/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storageId: img.storageId }) }).catch(console.error)
            }
            return prev.filter(i => i.id !== id)
        })
    }

    const handleUrl = () => { setIsExpanded(true); setUrlMode(true); setTimeout(() => expandedRef.current?.focus(), 50) }
    const handleEnhance = async () => {}

    const handleSend = () => {
        if (!message.trim() || isLoading) return
        const imageStorageIds = uploadedImages.filter(img => img.storageId !== null && !img.error).map(img => img.storageId as string)
        onSend(message.trim(), {
            urls: urlTags.length > 0 ? urlTags : undefined,
            imageStorageIds: imageStorageIds.length > 0 ? imageStorageIds : undefined,
        })
        setMessage(''); setIsExpanded(false); setUploadedImages([]); setUrlTags([]); setUrlMode(false); setUrlInputValue('')
    }

    const handleCollapsedChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value
        setMessage(val)
        const el = e.target
        el.style.height = 'auto'
        const sh = el.scrollHeight
        el.style.height = '20px'
        if (sh > 32) setIsExpanded(true)
    }

    const handleCollapsedKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') { e.preventDefault(); if (e.shiftKey) setIsExpanded(true); else if (message.trim()) handleSend() }
    }

    const handleExpandedChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value; setMessage(val)
        const el = e.target; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 140) + 'px'
        if (!val && !attachedFrameId) setIsExpanded(false)
    }

    const handleExpandedKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
        if (e.key === 'Backspace' && message === '' && !attachedFrameId) setIsExpanded(false)
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const imageItems = Array.from(e.clipboardData.items).filter(item => item.type.startsWith('image/'))
        if (imageItems.length > 0) { e.preventDefault(); imageItems.forEach(item => { const file = item.getAsFile(); if (file) handleUpload(file) }) }
    }

    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current++; if (e.dataTransfer.types.includes('Files')) setIsDragging(true) }
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false) }
    const handleDragOver = (e: React.DragEvent) => e.preventDefault()
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); dragCounter.current = 0; setIsDragging(false)
        Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')).forEach(handleUpload)
    }

    const t = isLight ? 'rgba(0,0,0' : 'rgba(255,255,255'

    const sendBtn = (
        <button
            onClick={handleSend}
            disabled={!message.trim() || isLoading}
            className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                message.trim() && !isLoading
                    ? "bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 cursor-pointer"
                    : "bg-black/[0.07] dark:bg-white/[0.07] text-black/25 dark:text-white/25 cursor-default"
            )}
        >
            {isLoading
                ? <div className="w-3 h-3 rounded-full border-[1.5px] border-t-transparent border-current animate-spin" />
                : <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
            }
        </button>
    )

    return (
        <>
            <motion.div
                layout
                transition={{ type: 'spring', damping: 30, stiffness: 340 }}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={cn(
                    "w-[540px] relative overflow-hidden bg-white dark:bg-[#111111] shadow-sm dark:shadow-2xl transition-[border-color,border-radius] duration-200",
                    isExpanded ? "rounded-[18px]" : "rounded-full",
                    isDragging ? "border-[1.5px] border-black/40 dark:border-white/40" : "border border-black/10 dark:border-white/10"
                )}
            >
                {/* COLLAPSED */}
                {!isExpanded && (
                    <div className="flex items-center gap-2 py-2.5 pl-3.5 pr-3">
                        <AttachmentMenu onUpload={handleUpload} onUrl={handleUrl} onEnhance={handleEnhance} hasInput={message.trim().length > 0} />
                        <textarea
                            ref={collapsedRef}
                            value={message}
                            rows={1}
                            onChange={handleCollapsedChange}
                            onKeyDown={handleCollapsedKeyDown}
                            onPaste={handlePaste}
                            placeholder="What would you like to change or create?"
                            className="flex-1 resize-none outline-none border-none bg-transparent text-[13px] text-neutral-900 dark:text-neutral-100 h-5 min-h-[20px] max-h-[20px] overflow-hidden font-sans tracking-tight leading-5 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                        />
                        {sendBtn}
                    </div>
                )}

                {/* EXPANDED */}
                {isExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {/* Attachments area */}
                        {(uploadedImages.length > 0 || urlTags.length > 0 || urlMode || attachedFrameId) && (
                            <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {uploadedImages.length > 0 && <ImagePreview images={uploadedImages} onRemove={handleRemoveImage} isLight={isLight} />}

                                {urlTags.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                        {urlTags.map((tag, i) => (
                                            <div key={tag + i} style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                                padding: '3px 8px', borderRadius: 6,
                                                border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                                                background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                                                fontSize: 11, color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
                                            }}>
                                                <Globe style={{ width: 10, height: 10 }} />
                                                <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {tag.replace(/^https?:\/\//, '')}
                                                </span>
                                                <button onClick={() => setUrlTags(prev => prev.filter((_, idx) => idx !== i))}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 0, opacity: 0.6 }}>
                                                    <X style={{ width: 9, height: 9 }} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {urlMode && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 8,
                                        border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                                        background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
                                    }}>
                                        <Globe style={{ width: 12, height: 12, color: isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
                                        <input
                                            autoFocus value={urlInputValue} onChange={e => setUrlInputValue(e.target.value)}
                                            onKeyDown={e => {
                                                if ((e.key === ' ' || e.key === 'Enter') && urlInputValue.trim()) {
                                                    e.preventDefault()
                                                    const raw = urlInputValue.trim()
                                                    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
                                                    setUrlTags(prev => [...prev, normalized]); setUrlInputValue('')
                                                }
                                                if (e.key === 'Escape') { setUrlMode(false); setUrlInputValue('') }
                                            }}
                                            placeholder="Paste a URL, press Enter…"
                                            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12, color: isLight ? '#0a0a0a' : '#f0f0f0', fontFamily: 'inherit' }}
                                        />
                                        <button onClick={() => { setUrlMode(false); setUrlInputValue('') }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)', padding: 0, lineHeight: 0 }}>
                                            <X style={{ width: 12, height: 12 }} />
                                        </button>
                                    </div>
                                )}

                                {attachedFrameId && (
                                    <div style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 8,
                                        padding: '4px 10px 4px 5px', borderRadius: 8, width: 'fit-content',
                                        border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                                        background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
                                    }}>
                                        <div style={{ width: 40, height: 30, borderRadius: 5, overflow: 'hidden', flexShrink: 0, background: isLight ? '#f0f0f0' : '#222' }}>
                                            {attachedThumbnailUrl
                                                ? <img src={attachedThumbnailUrl} alt="Frame" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <div style={{ width: '100%', height: '100%' }} />
                                            }
                                        </div>
                                        <span style={{ fontSize: 12, color: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                                            {attachedFrameName ?? 'Frame'}
                                        </span>
                                        <button onClick={onDetachFrame} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)', padding: 0, lineHeight: 0 }}>
                                            <X style={{ width: 12, height: 12 }} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <textarea
                            ref={expandedRef}
                            onChange={handleExpandedChange}
                            onKeyDown={handleExpandedKeyDown}
                            onPaste={handlePaste}
                            placeholder="What would you like to change or create?"
                            style={{
                                width: '100%', resize: 'none', outline: 'none', border: 'none', background: 'transparent',
                                fontSize: 13, color: isLight ? '#0a0a0a' : '#f0f0f0',
                                minHeight: 52, maxHeight: 140, overflow: 'hidden',
                                padding: '14px 14px 0', fontFamily: 'inherit',
                                letterSpacing: '-0.01em', lineHeight: 1.6,
                                boxSizing: 'border-box',
                            }}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 12px 14px' }}>
                            <AttachmentMenu onUpload={handleUpload} onUrl={handleUrl} onEnhance={handleEnhance} hasInput={message.trim().length > 0} />
                            <div style={{ flex: 1 }} />
                            {sendBtn}
                        </div>
                    </div>
                )}
            </motion.div>
        </>
    )
}