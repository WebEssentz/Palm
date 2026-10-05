'use client'

import React, { useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAppSelector, useAppDispatch } from '@/redux/store'
import { setSidebarOpen } from '@/redux/slice/ui'
import { useProjects } from '@/components/projects/list/provider'
import { usePersistentInput } from '@/hooks/use-persistent-input'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { formatDistanceToNow } from 'date-fns'
import { ArrowUp, Globe, X, PanelLeft, Loader, Search } from 'lucide-react'
import { ThemeToggle } from '@/components/theme/toggle'
import { AvatarDropdown } from '@/components/avatar-dropdown'
import { GlassTooltip } from '@/components/ui/glass-tooltip'
import { MobileDrawer } from '@/components/ui/mobile-drawer'
import DotParticleBackground from '@/components/home/dot-particle-background'
import { MicButton } from '@/components/home/mic-button'
import { AttachmentMenu } from '@/components/home/attachment-menu'
import { ImagePreview, type ImageItem } from '@/components/home/image-preview'
import Sidebar, { thumbnailToSrc } from '@/components/home/sidebar'
import ProjectsList from '@/components/projects/list'
import TrashList from '@/components/projects/trash-list'
import { usePalmToast } from '@/hooks/use-palmtoast'
import { combinedSlug } from '@/lib/utils'
import { getGreeting } from '@/lib/greeting'
import ProjectToolbar, { ProjectVisibilityTab } from '@/components/home/project-toolbar'
import ProjectSections from '@/components/home/project-sections'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isColorDark(color: string | undefined): boolean {
    const hex = (color?.match(/#[a-fA-F0-9]{6}/) || [])[0]
    if (!hex) return true
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.35
}

// ─── HomeShell ────────────────────────────────────────────────────────────────
interface Props {
    profile: { name: string; image?: string | null }
    view?: 'home' | 'projects' | 'trash'
}

export default function HomeShell({ profile, view = 'home' }: Props) {
    const { theme, systemTheme } = useTheme()
    const me = useQuery(api.user.getCurrentUser)
    const sideOpen = useAppSelector(s => s.ui.sidebarOpen)
    const dispatch = useAppDispatch()
    const projects = useProjects()
    const router = useRouter()
    const userSlug = combinedSlug(me?.name ?? '', me?._id)
    const { toast } = usePalmToast()

    const { prompt, setPrompt, urlTags, setUrlTags, uploadedImages, setUploadedImages, clearPersistedInput } = usePersistentInput()

    const [isFocused, setIsFocused] = useState(false)
    const [enhancing, setEnhancing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [pendingSend, setPendingSend] = useState(false)
    const [isRecordingActive, setIsRecordingActive] = useState(false)
    const [micState, setMicState] = useState<'idle' | 'recording' | 'processing'>('idle')
    const [hasDeletedOptimistic, setHasDeletedOptimistic] = useState(false)
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [urlMode, setUrlMode] = useState(false)
    const [urlInputValue, setUrlInputValue] = useState('')

    const [selectedProject, setSelectedProject] = useState<{ _id: string; name: string } | null>(null)
    const [activeTab, setActiveTab] = useState<ProjectVisibilityTab>('all')
    const [projectSearchQuery, setProjectSearchQuery] = useState('')

    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const dragCounter = useRef(0)
    const pendingSendRef = useRef(false)
    const uploadAbortControllers = useRef<Map<string, AbortController>>(new Map())
    const uploadedImagesRef = useRef<ImageItem[]>([])

    // Focus search on Ctrl+K / Cmd+K
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Auto-resize textarea when persisted prompt loads
    React.useEffect(() => {
        const el = textareaRef.current
        if (!el) return
        el.style.height = 'auto'
        if (!prompt) return
        el.style.height = Math.min(el.scrollHeight, 300) + 'px'
    }, [prompt])

    React.useEffect(() => { uploadedImagesRef.current = uploadedImages }, [uploadedImages])
    React.useEffect(() => {
        if (view !== 'home') dispatch(setSidebarOpen(true))
    }, [view, dispatch])

    const creditBalance = useQuery(api.subscription.getCreditsBalance, me?._id ? { userId: me._id as Id<'users'> } : 'skip')
    const hasDeleted = useQuery(api.projects.hasDeletedProjects, me?._id ? { userId: me._id as Id<'users'> } : 'skip')
    const trashedProjects = useQuery(api.projects.getDeletedProjects, me?._id ? { userId: me._id as Id<'users'> } : 'skip') ?? []

    if (!me) return <Loader />

    const isLight = (theme === 'system' ? systemTheme : theme) === 'light'
    const text = isLight ? '#0a0a0a' : '#ffffff'
    const muted = isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.38)'
    const border = isLight ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.09)'
    const cardBg = isLight ? '#ffffff' : '#141414'

    // ── Upload ────────────────────────────────────────────────────────────────
    const handleUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) return
        const previewUrl = URL.createObjectURL(file)
        const id = Math.random().toString(36).slice(2, 9)
        const ctrl = new AbortController()
        uploadAbortControllers.current.set(id, ctrl)
        setUploadedImages(prev => [...prev, { id, previewUrl, storageId: null }])
        try {
            const form = new FormData(); form.append('file', file)
            const res = await fetch('/api/upload', { method: 'POST', body: form, signal: ctrl.signal })
            if (!res.ok) throw new Error('Upload failed')
            const { storageId } = await res.json()
            uploadAbortControllers.current.delete(id)
            setUploadedImages(prev => {
                const updated = prev.map(img => img.id === id ? { ...img, storageId } : img)
                if (!updated.some(i => i.storageId === null && !i.error) && pendingSendRef.current) {
                    pendingSendRef.current = false; setPendingSend(false); setTimeout(() => handleSubmit(), 0)
                }
                return updated
            })
        } catch (err: any) {
            if (err?.name === 'AbortError') return
            setUploadedImages(prev => prev.map(img => img.id === id ? { ...img, error: true } : img))
            pendingSendRef.current = false; setPendingSend(false)
        } finally { uploadAbortControllers.current.delete(id) }
    }

    const handleRemoveImage = (id: string) => {
        uploadAbortControllers.current.get(id)?.abort()
        uploadAbortControllers.current.delete(id)
        setUploadedImages(prev => {
            const img = prev.find(i => i.id === id)
            if (img) {
                URL.revokeObjectURL(img.previewUrl)
                if (img.storageId) fetch('/api/files/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storageId: img.storageId }) }).catch(console.error)
            }
            const remaining = prev.filter(i => i.id !== id)
            if (!remaining.some(i => i.storageId === null && !i.error) && pendingSendRef.current) { pendingSendRef.current = false; setPendingSend(false) }
            return remaining
        })
    }

    // ── Drag ──────────────────────────────────────────────────────────────────
    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current++; if (e.dataTransfer.types.includes('Files')) setIsDragging(true) }
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false) }
    const handleDragOver = (e: React.DragEvent) => e.preventDefault()
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); dragCounter.current = 0; setIsDragging(false)
        Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')).forEach(handleUpload)
    }
    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const imgs = Array.from(e.clipboardData.items).filter(i => i.type.startsWith('image/'))
        if (imgs.length) { e.preventDefault(); imgs.forEach(i => { const f = i.getAsFile(); if (f) handleUpload(f) }) }
    }

    // ── Enhance ───────────────────────────────────────────────────────────────
    const handleEnhance = async () => {
        if (!prompt.trim() || enhancing) return
        setEnhancing(true); toast('Enhancing…', { type: 'info', duration: 999999 })
        try {
            const res = await fetch('/api/enhance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt.trim() }) })
            const { enhanced, error } = await res.json()
            if (enhanced) { setPrompt(enhanced); toast('Enhanced ✨', { type: 'success', duration: 2500 }) }
            else { toast('Failed to enhance', { type: 'error', duration: 3500 }); console.error(error) }
        } catch (err) { toast('Error', { type: 'error', duration: 3500 }); console.error(err) }
        finally { setEnhancing(false) }
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!prompt.trim() || isLoading) return
        // Drop orphaned uploads left over from a previous session.
        const cleaned = uploadedImagesRef.current.filter(
            img => img.storageId !== null || img.error || uploadAbortControllers.current.has(img.id)
        )
        if (cleaned.length !== uploadedImagesRef.current.length) {
            setUploadedImages(cleaned)
            uploadedImagesRef.current = cleaned
        }
        const currentImages = cleaned
        if (currentImages.some(img => img.storageId === null && !img.error)) { pendingSendRef.current = true; setPendingSend(true); return }
        setIsLoading(true)
        try {
            let finalPrompt = prompt.trim()
            if (urlTags.length > 0) {
                toast('Analyzing references…', { type: 'info', duration: 999999 })
                const r = await fetch('/api/url-analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls: urlTags, prompt: finalPrompt }) })
                const { enhanced } = await r.json()
                if (enhanced) { finalPrompt = enhanced; toast('References analyzed ✨', { type: 'success', duration: 2000 }) }
            }
            const imageStorageIds = currentImages.filter(img => img.storageId && !img.error).map(img => img.storageId as string)
            if (selectedProject) {
                clearPersistedInput()
                router.push(
                    `/dashboard/${userSlug}/canvas?project=${selectedProject._id}&prompt=${encodeURIComponent(finalPrompt)}${imageStorageIds.length ? `&images=${encodeURIComponent(JSON.stringify(imageStorageIds))}` : ''
                    }`
                )
            } else {
                const res = await fetch('/api/projects/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: finalPrompt, userId: me._id,
                        ...(urlTags.length && { referenceUrls: urlTags }),
                        ...(imageStorageIds.length && { imageStorageIds }),
                    }),
                })
                const { projectId, error, details } = await res.json()
                if (!res.ok || !projectId) throw new Error(details || error)
                clearPersistedInput()
                router.push(
                    `/dashboard/${userSlug}/canvas?project=${projectId}&prompt=${encodeURIComponent(finalPrompt)}${imageStorageIds.length ? `&images=${encodeURIComponent(JSON.stringify(imageStorageIds))}` : ''
                    }`
                )
            }
        } catch (err) { console.error(err); setIsLoading(false) }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }

    // ── Render ────────────────────────────────────────────────────────────────
    const spinnerColor = isLight
        ? (prompt.trim() ? '#fff' : 'rgba(0,0,0,0.3)')
        : (prompt.trim() ? '#000' : 'rgba(255,255,255,0.3)')

    const createProjectMutation = useMutation(api.projects.createProject)

    const handleNew = async (visibility?: ProjectVisibilityTab) => {
        try {
            setSelectedProject(null)
            const targetVisibility = visibility || activeTab || 'workspace'
            const res = await createProjectMutation({
                visibility: targetVisibility === 'private' ? 'private' : 'workspace',
            })
            if (res?._id) {
                router.push(`/dashboard/${userSlug}/canvas?project=${res._id}`)
            }
        } catch (e) {
            console.error('Failed to create new project', e)
        }
    }

    return (
        <>
            <div style={{ display: 'flex', height: '100vh', width: '100vw', background: isLight ? '#ffffff' : '#0a0a0a', position: 'relative', overflow: 'hidden' }}>
                {/* <DotParticleBackground isLight={isLight} /> */}

                <Sidebar
                    userSlug={userSlug}
                    isLight={isLight}
                    text={text}
                    muted={muted}
                    border={border}
                    view={view}
                    hasDeleted={!!(hasDeleted || hasDeletedOptimistic)}
                    onNewProject={handleNew}
                />

                {/* ── Main ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', position: 'relative', zIndex: 10, overflow: 'hidden' }}>

                    {/* Topbar */}
                    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', flexShrink: 0 }}>
                        {/* Left */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {/* Mobile menu */}
                            <button className="md:hidden" onClick={() => setIsMobileDrawerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4 }}>
                                <PanelLeft style={{ width: 16, height: 16 }} />
                            </button>
                        </div>

                        {/* Right */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {/* <AvatarDropdown creditBalance={creditBalance ?? 0} /> */}
                        </div>
                    </header>

                    {/* Content */}
                    <main style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        overflowY: 'auto',
                        width: '100%',
                    }}>
                        <div style={{ width: '100%', maxWidth: 1400, margin: '0 auto', padding: '12px 32px 80px' }}>

                        {view === 'projects' ? (
                            <div style={{ width: '100%' }}>
                                <ProjectsList onProjectDelete={() => setHasDeletedOptimistic(true)} />
                            </div>
                        ) : view === 'trash' ? (
                            <TrashList onTrashEmpty={() => setHasDeletedOptimistic(false)} />
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                            >
                                {/* ── Greeting & Search Row ── */}
                                <div
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 16,
                                        margin: '-6px 0 16px',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <h1 style={{ fontSize: 24, fontWeight: 600, color: text, margin: 0, letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                                        {getGreeting(me?.name ?? profile?.name)}
                                    </h1>

                                    {/* Top-Right Search Input */}
                                    <div
                                        style={{
                                            position: 'relative',
                                            display: 'flex',
                                            alignItems: 'center',
                                            width: '100%',
                                            maxWidth: 270,
                                            minWidth: 190,
                                        }}
                                    >
                                        <Search
                                            style={{
                                                position: 'absolute',
                                                left: 11,
                                                width: 14,
                                                height: 14,
                                                color: muted,
                                                pointerEvents: 'none',
                                            }}
                                        />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={projectSearchQuery}
                                            onChange={(e) => setProjectSearchQuery(e.target.value)}
                                            placeholder="Search projects"
                                            style={{
                                                width: '100%',
                                                height: 35,
                                                padding: '0 56px 0 33px',
                                                fontSize: 13,
                                                borderRadius: 10,
                                                border: `1px solid ${border}`,
                                                background: isLight ? '#ffffff' : 'rgba(255,255,255,0.04)',
                                                color: text,
                                                outline: 'none',
                                                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                                            }}
                                            onFocus={(e) => {
                                                e.currentTarget.style.borderColor = isLight ? '#000000' : 'rgba(255,255,255,0.4)'
                                            }}
                                            onBlur={(e) => {
                                                e.currentTarget.style.borderColor = border
                                            }}
                                        />
                                        {projectSearchQuery ? (
                                            <button
                                                onClick={() => {
                                                    setProjectSearchQuery('')
                                                    searchInputRef.current?.focus()
                                                }}
                                                type="button"
                                                style={{
                                                    position: 'absolute',
                                                    right: 8,
                                                    width: 18,
                                                    height: 18,
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)',
                                                    border: 'none',
                                                    color: muted,
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                }}
                                            >
                                                <X style={{ width: 11, height: 11 }} />
                                            </button>
                                        ) : (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    right: 8,
                                                    padding: '2px 5px',
                                                    borderRadius: 4,
                                                    fontSize: 10,
                                                    fontWeight: 500,
                                                    letterSpacing: '0.02em',
                                                    background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
                                                    color: muted,
                                                    pointerEvents: 'none',
                                                    userSelect: 'none',
                                                }}
                                            >
                                                ⌘K
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ── Input Card (Commented out) ── */}
                                {/*
                                <div className={`palm-input-wrapper${isLight ? ' is-light' : ''}`} style={{ width: '100%', maxWidth: 640 }}>
                                    <motion.div
                                        layout
                                        transition={{ layout: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } }}
                                        onDragEnter={handleDragEnter}
                                        onDragLeave={handleDragLeave}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                        style={{
                                            width: '100%', borderRadius: 16,
                                            background: isLight ? '#ffffff' : '#161616',
                                            border: `1px solid transparent`,
                                            boxShadow: isFocused
                                                ? (isLight ? '0 2px 16px rgba(0,0,0,0.08)' : '0 2px 16px rgba(0,0,0,0.5)')
                                                : (isLight ? '0 1px 3px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)' : '0 1px 3px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.4)'),
                                            transition: 'border-color 0.15s, box-shadow 0.15s',
                                        }}
                                    >
                                        <div style={{ padding: '14px 14px 10px' }}>

                                            // Selected project tag
                                            <AnimatePresence>
                                                {selectedProject && (
                                                    <motion.div
                                                        layout
                                                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                                        animate={{ opacity: 1, height: 'auto', marginBottom: 10 }}
                                                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                                        style={{ overflow: 'hidden' }}
                                                    >
                                                        <div style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                                            padding: '3px 8px 3px 10px', borderRadius: 6,
                                                            background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                                                            border: `1px solid ${border}`, fontSize: 12, color: muted,
                                                        }}>
                                                            <span style={{ fontSize: 10 }}>↩</span>
                                                            <span style={{ fontWeight: 500, color: text }}>{selectedProject.name}</span>
                                                            <button
                                                                onClick={() => setSelectedProject(null)}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 0, lineHeight: 0, marginLeft: 2 }}
                                                            >
                                                                <X style={{ width: 11, height: 11 }} />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            // Image previews
                                            <ImagePreview images={uploadedImages} onRemove={handleRemoveImage} isLight={isLight} />

                                            // URL tags
                                            <AnimatePresence>
                                                {urlTags.length > 0 && (
                                                    <motion.div
                                                        layout
                                                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                                        style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 5, overflow: 'hidden' }}
                                                    >
                                                        {urlTags.map((tag, i) => (
                                                            <div key={tag + i} style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                                                padding: '3px 8px', borderRadius: 6,
                                                                border: `1px solid ${border}`,
                                                                background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                                                                fontSize: 12, color: muted,
                                                            }}>
                                                                <Globe style={{ width: 11, height: 11 }} />
                                                                <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {tag.replace(/^https?:\/\//, '')}
                                                                </span>
                                                                <button onClick={() => setUrlTags(prev => prev.filter((_, idx) => idx !== i))}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 0 }}>
                                                                    <X style={{ width: 10, height: 10 }} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            // Textarea
                                            <textarea
                                                ref={textareaRef}
                                                value={prompt}
                                                onChange={e => {
                                                    setPrompt(e.target.value)
                                                    e.target.style.height = 'auto'
                                                    e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px'
                                                }}
                                                onFocus={() => setIsFocused(true)}
                                                onBlur={() => setIsFocused(false)}
                                                onKeyDown={handleKeyDown}
                                                onPaste={handlePaste}
                                                placeholder={
                                                    micState === 'recording' ? 'Listening…'
                                                        : micState === 'processing' ? 'Transcribing…'
                                                            : isDragging ? 'Drop images here…'
                                                                : selectedProject ? `Message ${selectedProject.name}…`
                                                                    : 'Describe a UI to generate…'
                                                }
                                                rows={1}
                                                style={{
                                                    width: '100%', resize: 'none', outline: 'none', border: 'none',
                                                    background: 'transparent', fontSize: 15, lineHeight: 1.65,
                                                    color: text, minHeight: 28, maxHeight: 300,
                                                    fontFamily: 'inherit', letterSpacing: '-0.012em',
                                                    boxSizing: 'border-box', display: 'block',
                                                    overflowY: 'auto',
                                                }}
                                            />

                                            // Toolbar
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>

                                                // Attachment
                                                <AttachmentMenu
                                                    onUpload={handleUpload}
                                                    onUrl={() => setUrlMode(true)}
                                                    onEnhance={handleEnhance}
                                                    enhancing={enhancing}
                                                    hasInput={!!prompt.trim()}
                                                    isLight={isLight}
                                                />

                                                // URL input mode
                                                <AnimatePresence mode="wait">
                                                    {urlMode ? (
                                                        <motion.div
                                                            key="url"
                                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                            style={{
                                                                flex: 1, display: 'flex', alignItems: 'center', gap: 6,
                                                                padding: '5px 10px', borderRadius: 8,
                                                                border: `1px solid ${border}`,
                                                                background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
                                                            }}
                                                        >
                                                            <Globe style={{ width: 13, height: 13, color: muted, flexShrink: 0 }} />
                                                            <input
                                                                autoFocus value={urlInputValue} onChange={e => setUrlInputValue(e.target.value)}
                                                                onKeyDown={e => {
                                                                    const add = (val: string) => {
                                                                        const n = /^https?:\/\//i.test(val) ? val : `https://${val}`
                                                                        setUrlTags(p => [...p, n]); setUrlInputValue('')
                                                                    }
                                                                    if (e.key === 'Enter' && urlInputValue.trim()) add(urlInputValue.trim())
                                                                    if (e.key === 'Escape') { setUrlMode(false); setUrlInputValue('') }
                                                                }}
                                                                placeholder="Paste a URL and press Enter…"
                                                                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: text, minWidth: 0 }}
                                                            />
                                                            <button onClick={() => { setUrlMode(false); setUrlInputValue('') }}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 0, lineHeight: 0 }}>
                                                                <X style={{ width: 13, height: 13 }} />
                                                            </button>
                                                        </motion.div>
                                                    ) : (
                                                        <motion.div
                                                            key="actions"
                                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}
                                                        >
                                                            // Mic
                                                            <MicButton
                                                                onTranscript={t => {
                                                                    console.log('[STT] received:', t)
                                                                    setPrompt(p => p ? p + ' ' + t : t)
                                                                }}
                                                                onRecordingChange={setIsRecordingActive}
                                                                onStateChange={setMicState}
                                                                disabled={isLoading}
                                                            />

                                                            // Send — always visible
                                                            <button
                                                                onClick={handleSubmit}
                                                                disabled={!prompt.trim() || isLoading}
                                                                type="button"
                                                                aria-label="Send prompt"
                                                                style={{
                                                                    width: 32, height: 32, borderRadius: '50%', border: 'none',
                                                                    background: prompt.trim() ? text : (isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'),
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    cursor: prompt.trim() ? 'pointer' : 'default',
                                                                    transition: 'all 0.15s ease', flexShrink: 0,
                                                                }}
                                                            >
                                                                {(isLoading || pendingSend)
                                                                    ? <div style={{ width: 13, height: 13, border: `2px solid ${spinnerColor}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                                                    : <ArrowUp style={{ width: 15, height: 15, strokeWidth: 2, color: prompt.trim() ? (isLight ? '#fff' : '#000') : (isLight ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.28)') }} />
                                                                }
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                                */}

                                {/* ── Project Filter Toolbar ── */}
                                <ProjectToolbar
                                    activeTab={activeTab}
                                    onTabChange={setActiveTab}
                                    isLight={isLight}
                                    text={text}
                                    muted={muted}
                                    border={border}
                                />

                                {/* ── Project Sections: Folders + Filtered Projects Grid ── */}
                                <ProjectSections
                                    projects={projects}
                                    activeTab={activeTab}
                                    searchQuery={projectSearchQuery}
                                    userSlug={userSlug}
                                    isLight={isLight}
                                    text={text}
                                    muted={muted}
                                    border={border}
                                    onNewProject={handleNew}
                                />
                            </motion.div>
                        )}
                        </div>
                    </main>
                </div>
            </div>

            {/* Spin & pulse keyframes + scrollbar hiding + circuit border animation */}
            <style>{`
                @property --angle {
                    syntax: '<angle>';
                    initial-value: 0deg;
                    inherits: false;
                }
                .palm-input-wrapper {
                    position: relative;
                    border-radius: 17px;
                    padding: 1px;
                }
                .palm-input-wrapper::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 17px;
                    background: conic-gradient(
                        from var(--angle),
                        transparent 0%,
                        transparent 65%,
                        rgba(255,255,255,0.04) 75%,
                        rgba(255,255,255,0.4) 88%,
                        rgba(255,255,255,0.95) 97%,
                        transparent 100%
                    );
                    animation: circuit 4s linear infinite;
                    z-index: 0;
                }

                .palm-input-wrapper.is-light::before {
                    background: conic-gradient(
                        from var(--angle),
                        transparent 0%,
                        transparent 65%,
                        rgba(0,0,0,0.03) 75%,
                        rgba(0,0,0,0.25) 88%,
                        rgba(0,0,0,0.7) 97%,
                        transparent 100%
                    );
                }
                .palm-input-wrapper > * { position: relative; z-index: 1; }

                .palm-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 12px;
                }
                .palm-feature { grid-column: span 2; }
                @media (max-width: 640px) {
                    .palm-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                    .palm-feature { grid-column: span 2; }
                }

                @keyframes circuit { to { --angle: 360deg; } }
                @keyframes spin { to { transform: rotate(360deg) } }
                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.75); }
                }
                div::-webkit-scrollbar { display: none; }
            `}</style>

            {/* Theme toggle */}
            <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 50 }}>
                <ThemeToggle />
            </div>

            {/* Mobile drawer */}
            <MobileDrawer
                isOpen={isMobileDrawerOpen}
                onClose={() => setIsMobileDrawerOpen(false)}
                projects={projects}
                trashedProjects={trashedProjects}
                hasDeleted={!!(hasDeleted || hasDeletedOptimistic)}
                userName={userSlug}
                isLightMode={isLight}
                thumbnailToSrc={thumbnailToSrc}
                isColorDark={isColorDark}
            />
        </>
    )
}