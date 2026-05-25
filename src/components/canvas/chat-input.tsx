'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { ArrowUp, Globe, X } from 'lucide-react'
import { motion } from 'framer-motion'
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

    // Auto-expand when a frame is attached
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
            const { storageId } = await res.json()
            setUploadedImages(prev => prev.map(img => img.id === id ? { ...img, storageId } : img))
        } catch {
            setUploadedImages(prev => prev.filter(img => img.id !== id))
        }
    }

    const handleRemoveImage = (id: string) => {
        setUploadedImages(prev => {
            const img = prev.find(i => i.id === id)
            if (img) {
                URL.revokeObjectURL(img.previewUrl)
                if (img.storageId) {
                    fetch('/api/files/delete', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ storageId: img.storageId }),
                    }).catch(console.error)
                }
            }
            return prev.filter(i => i.id !== id)
        })
    }

    const handleUrl = () => {
        setIsExpanded(true)
        setUrlMode(true)
        setTimeout(() => expandedRef.current?.focus(), 50)
    }

    const handleEnhance = async () => {
        if (!message.trim()) return
        // wire up to your /api/enhance if needed — no-op for now
    }

    const handleSend = () => {
        if (!message.trim() || isLoading) return
        const imageStorageIds = uploadedImages
            .filter(img => img.storageId !== null)
            .map(img => img.storageId as string)
        onSend(message.trim(), {
            urls: urlTags.length > 0 ? urlTags : undefined,
            imageStorageIds: imageStorageIds.length > 0 ? imageStorageIds : undefined,
        })
        setMessage('')
        setIsExpanded(false)
        setUploadedImages([])
        setUrlTags([])
        setUrlMode(false)
        setUrlInputValue('')
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
        if (e.key === 'Enter') {
            e.preventDefault()
            if (e.shiftKey) setIsExpanded(true)
            else if (message.trim()) handleSend()
        }
    }

    const handleExpandedChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value
        setMessage(val)
        const el = e.target
        el.style.height = 'auto'
        el.style.height = Math.min(el.scrollHeight, 140) + 'px'
        if (!val && !attachedFrameId) setIsExpanded(false)
    }

    const handleExpandedKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
        if (e.key === 'Backspace' && message === '' && !attachedFrameId) {
            setIsExpanded(false)
        }
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const imageItems = Array.from(e.clipboardData.items)
            .filter(item => item.type.startsWith('image/'))
        if (imageItems.length > 0) {
            e.preventDefault()
            imageItems.forEach(item => {
                const file = item.getAsFile()
                if (file) handleUpload(file)
            })
        }
    }

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault()
        dragCounter.current++
        if (e.dataTransfer.types.includes('Files')) setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        dragCounter.current--
        if (dragCounter.current === 0) setIsDragging(false)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        dragCounter.current = 0
        setIsDragging(false)
        Array.from(e.dataTransfer.files)
            .filter(f => f.type.startsWith('image/'))
            .forEach(handleUpload)
    }

    const containerStyle: React.CSSProperties = isLight ? {
        background: 'rgba(250,246,238,0.92)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        border: '1px solid rgba(120,96,60,0.18)',
        boxShadow: [
            '0 0 0 0.5px rgba(100,76,40,0.08)',
            '0 4px 24px rgba(80,60,30,0.12)',
            'inset 0 1px 0 rgba(255,255,255,0.90)',
        ].join(', '),
    } : {
        background: 'rgba(18,18,18,0.85)',
        backdropFilter: 'blur(32px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: [
            '0 0 0 0.5px rgba(255,255,255,0.04)',
            '0 4px 24px rgba(0,0,0,0.45)',
            '0 8px 32px rgba(0,0,0,0.35)',
            'inset 0 1px 0 rgba(255,255,255,0.08)',
            'inset 0 -1px 0 rgba(0,0,0,0.2)',
        ].join(', '),
    }

    const chipStyle: React.CSSProperties = isLight ? {
        background: 'rgba(120,96,60,0.07)',
        border: '1px solid rgba(120,96,60,0.20)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.70)',
    } : {
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
    }

    const sendButton = (
        <button
            onClick={handleSend}
            disabled={!message.trim() || isLoading}
            className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0',
                message.trim() && !isLoading
                    ? 'bg-foreground text-background'
                    : 'opacity-30 bg-foreground/10 text-foreground'
            )}
        >
            {isLoading
                ? <div className='w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin' />
                : <ArrowUp className='w-3.5 h-3.5' />
            }
        </button>
    )

    const attachmentsBlock = isExpanded ? (
        <div className='px-3 pt-2.5 flex flex-col gap-2'>
            {/* Images */}
            {uploadedImages.length > 0 && (
                <ImagePreview images={uploadedImages} onRemove={handleRemoveImage} />
            )}

            {/* URL tags */}
            {urlTags.length > 0 && (
                <div className='flex flex-wrap gap-1.5'>
                    {urlTags.map((tag, i) => (
                        <div
                            key={tag + i}
                            className='flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium'
                            style={chipStyle}
                        >
                            <Globe className='w-3 h-3 opacity-60 flex-shrink-0' />
                            <span className='max-w-[140px] truncate'>{tag.replace(/^https?:\/\//, '')}</span>
                            <button
                                onClick={() => setUrlTags(prev => prev.filter((_, idx) => idx !== i))}
                                className='opacity-50 hover:opacity-100 transition-opacity ml-0.5'
                            >
                                <X className='w-3 h-3' />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* URL input row */}
            {urlMode && (
                <div
                    className='flex items-center gap-2 rounded-full px-3 py-1.5'
                    style={chipStyle}
                >
                    <Globe className='w-3.5 h-3.5 opacity-50 flex-shrink-0' />
                    <input
                        autoFocus
                        value={urlInputValue}
                        onChange={e => setUrlInputValue(e.target.value)}
                        onKeyDown={e => {
                            if ((e.key === ' ' || e.key === 'Enter') && urlInputValue.trim()) {
                                e.preventDefault()
                                const raw = urlInputValue.trim().toLowerCase()
                                const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
                                setUrlTags(prev => [...prev, normalized])
                                setUrlInputValue('')
                            }
                            if (e.key === 'Escape') { setUrlMode(false); setUrlInputValue('') }
                        }}
                        placeholder={urlTags.length > 0 ? 'Add another URL…' : 'Paste a URL, press Enter…'}
                        className='flex-1 text-xs outline-none bg-transparent text-foreground placeholder:text-muted-foreground/50'
                    />
                    <button onClick={() => { setUrlMode(false); setUrlInputValue('') }} className='opacity-50 hover:opacity-100 transition-opacity'>
                        <X className='w-3 h-3' />
                    </button>
                </div>
            )}

            {/* Frame chip */}
            {attachedFrameId && (
                <div
                    className='flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl text-xs w-fit'
                    style={chipStyle}
                >
                    <div style={{ width: 48, height: 36, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: isLight ? 'rgba(120,96,60,0.08)' : 'rgba(255,255,255,0.08)' }}>
                        {attachedThumbnailUrl
                            ? <img src={attachedThumbnailUrl} alt='Frame' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div className='w-full h-full flex items-center justify-center opacity-30'><div className='w-5 h-4 rounded bg-foreground' /></div>
                        }
                    </div>
                    <span className='text-foreground/70 font-medium' style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {attachedFrameName ?? 'Frame'}
                    </span>
                    <button onClick={onDetachFrame} className='text-foreground/35 hover:text-foreground/65 transition-colors ml-0.5 leading-none' style={{ fontSize: 15 }}>×</button>
                </div>
            )}
        </div>
    ) : null

    return (
        <motion.div
            layout
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className='relative w-[540px] overflow-hidden'
            style={{
                ...containerStyle,
                borderRadius: isExpanded ? '20px' : '9999px',
                outline: isDragging ? '2px solid rgba(160,120,60,0.45)' : 'none',
            }}
        >
            {/* Specular rim */}
            <div
                className='pointer-events-none absolute inset-x-0 top-0 h-[1px]'
                style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.75) 50%, transparent 95%)' }}
            />

            {/* COLLAPSED */}
            {!isExpanded && (
                <div className='flex items-center gap-2 px-4 py-3'>
                    <AttachmentMenu
                        onUpload={handleUpload}
                        onUrl={handleUrl}
                        onEnhance={handleEnhance}
                        hasInput={message.trim().length > 0}
                    />
                    <textarea
                        ref={collapsedRef}
                        value={message}
                        rows={1}
                        onChange={handleCollapsedChange}
                        onKeyDown={handleCollapsedKeyDown}
                        onPaste={handlePaste}
                        placeholder='What would you like to change or create?'
                        className='flex-1 resize-none text-sm outline-none bg-transparent text-foreground placeholder:text-muted-foreground/40 leading-relaxed min-w-0'
                        style={{ height: '20px', minHeight: '20px', maxHeight: '20px', overflow: 'hidden' }}
                    />
                    {sendButton}
                </div>
            )}

            {/* EXPANDED */}
            {isExpanded && (
                <div className='flex flex-col gap-1'>
                    {/* All attachments: images, URLs, frame chip */}
                    {attachmentsBlock}

                    <textarea
                        ref={expandedRef}
                        onChange={handleExpandedChange}
                        onKeyDown={handleExpandedKeyDown}
                        onPaste={handlePaste}
                        placeholder='What would you like to change or create?'
                        className='w-full resize-none text-sm outline-none bg-transparent text-foreground placeholder:text-muted-foreground/40 leading-relaxed px-4 pt-2'
                        style={{ minHeight: '52px', maxHeight: '140px', overflow: 'hidden' }}
                    />
                    <div className='flex items-center gap-2 px-4 pb-1'>
                        <AttachmentMenu
                            onUpload={handleUpload}
                            onUrl={handleUrl}
                            onEnhance={handleEnhance}
                            hasInput={message.trim().length > 0}
                        />
                        <div className='flex-1' />
                        {sendButton}
                    </div>
                </div>
            )}
        </motion.div>
    )
}