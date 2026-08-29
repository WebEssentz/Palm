'use client'

import React, { useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAppSelector, useAppDispatch } from '@/redux/store'
import { toggleSidebar, setSidebarOpen } from '@/redux/slice/ui'
import { useProjects } from '@/components/projects/list/provider'
import { usePersistentInput } from '@/hooks/use-persistent-input'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { formatDistanceToNow } from 'date-fns'
import { Home, LayoutGrid, Trash2, ArrowUp, Globe, X, PanelLeft, Loader, LayoutDashboard, Smartphone, ShoppingBag, Shuffle } from 'lucide-react'
import { ThemeToggle } from '@/components/theme/toggle'
import { AvatarDropdown } from '@/components/avatar-dropdown'
import { GlassTooltip } from '@/components/ui/glass-tooltip'
import { MobileDrawer } from '@/components/ui/mobile-drawer'
import DotParticleBackground from '@/components/home/dot-particle-background'
import { MicButton } from '@/components/home/mic-button'
import { AttachmentMenu } from '@/components/home/attachment-menu'
import { ImagePreview, type ImageItem } from '@/components/home/image-preview'
import ProjectsList from '@/components/projects/list'
import TrashList from '@/components/projects/trash-list'
import { usePalmToast } from '@/hooks/use-palmtoast'
import { combinedSlug } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function thumbnailToSrc(thumbnail: string | undefined): string | null {
    if (!thumbnail) return null
    if (thumbnail.startsWith('linear-gradient')) {
        const colors = thumbnail.match(/#[a-fA-F0-9]{6}/g) || ['#888', '#444']
        const [c1, c2] = colors.length >= 2 ? [colors[0], colors[1]] : [colors[0] || '#888', '#444']
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="20" height="20" rx="4" fill="url(#g)"/></svg>`
        return `data:image/svg+xml,${encodeURIComponent(svg)}`
    }
    return null
}

function isColorDark(color: string | undefined): boolean {
    const hex = (color?.match(/#[a-fA-F0-9]{6}/) || [])[0]
    if (!hex) return true
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.35
}

function getGreeting(name: string) {
    const h = new Date().getHours()
    const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
    const first = name.split(' ')[0]
    return `Good ${time}, ${first}.`
}

// ─── Prompts ──────────────────────────────────────────────────────────────────
const ALL_PROMPTS = [
    { short: 'Landing page for a coffee roastery', long: "Build a modern landing page for an artisan coffee roastery called 'Bean Canvas'. Include a hero section, featured blends with tasting notes, about section, testimonials, and newsletter signup. Use warm earth tones." },
    { short: 'Fitness tracker dashboard', long: 'Create a comprehensive fitness tracking dashboard with step count, calories, heart rate trends, workout history, weekly goals, and achievements. Energetic color scheme.' },
    { short: 'E-commerce product listing', long: 'Design an e-commerce product listing page with filtering, grid view, sidebar filters, sorting options, quick-view cards, and a cart indicator.' },
    { short: 'Task management app', long: 'Build a task management interface with a sidebar, Kanban columns (To Do, In Progress, Done), task cards with assignee and due date, and a detail panel.' },
    { short: 'SaaS analytics dashboard', long: 'Create a professional analytics dashboard with KPI cards, line charts, heatmaps, sortable data tables. Clean minimal design.' },
    { short: 'Hotel booking interface', long: 'Design a luxury hotel booking platform with hero search, property cards, photo galleries, room options, and checkout. Elegant typography.' },
    { short: 'Music streaming app', long: 'Build a music streaming interface with sidebar playlists, album artwork, waveform viz, playback controls, and search. Dark theme.' },
    { short: 'Social media feed', long: 'Create a social feed with story avatars, post cards, engagement metrics, nested comments, and trending sidebar.' },
    { short: 'Weather application', long: 'Build a weather app with large temp display, hourly and 7-day forecast, metrics (humidity, UV, wind), radar map, location search.' },
    { short: 'Project management board', long: 'Design a Kanban board with Backlog → Done columns, draggable cards with avatars and priority, and team/filter sidebar.' },
]
const getRandomPrompts = () => [...ALL_PROMPTS].sort(() => Math.random() - 0.5).slice(0, 3)

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
    const CATEGORIES = [
        { icon: <LayoutDashboard style={{ width: 13, height: 13 }} />, label: 'Dashboard', prompt: 'Create a professional SaaS analytics dashboard with KPI cards, line charts, user activity heatmap, and sortable data tables. Clean minimal design with a sidebar nav.' },
        { icon: <Globe style={{ width: 13, height: 13 }} />, label: 'Landing page', prompt: 'Build a bold, modern landing page for a tech startup. Hero section with headline and CTA, features grid, testimonials, and a pricing section.' },
        { icon: <Smartphone style={{ width: 13, height: 13 }} />, label: 'Mobile app', prompt: 'Design a clean mobile app UI with onboarding screens, a home feed, bottom nav bar, and a profile page. iOS-style, minimal.' },
        { icon: <ShoppingBag style={{ width: 13, height: 13 }} />, label: 'E-commerce', prompt: 'Design an e-commerce product page with image gallery, size selector, reviews, related products, and add-to-cart. Premium fashion aesthetic.' },
        { icon: <Shuffle style={{ width: 13, height: 13 }} />, label: 'Surprise me', prompt: ALL_PROMPTS[Math.floor(Math.random() * ALL_PROMPTS.length)].long },
    ]

    const [selectedProject, setSelectedProject] = useState<{ _id: string; name: string } | null>(null)

    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const dragCounter = useRef(0)
    const pendingSendRef = useRef(false)
    const uploadAbortControllers = useRef<Map<string, AbortController>>(new Map())
    const uploadedImagesRef = useRef<ImageItem[]>([])

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
    return (
        <>
            <div style={{ display: 'flex', minHeight: '100dvh', background: isLight ? '#fafafa' : '#0a0a0a', position: 'relative', overflow: 'hidden' }}>
                <DotParticleBackground isLight={isLight} />

                {/* ── Sidebar — only shown on projects/trash views ── */}
                <AnimatePresence>
                    {sideOpen && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 240, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                                flexShrink: 0, height: '100vh', position: 'fixed', top: 0, left: 0,
                                borderRight: `1px solid ${border}`,
                                background: isLight ? '#f0f0f0' : 'rgba(10,10,10,0.9)',
                                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                                display: 'flex', flexDirection: 'column', zIndex: 20, overflow: 'hidden',
                            }}
                        >
                            {/* ── Logo + collapse ── */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '18px 18px 0', flexShrink: 0,
                            }}>
                                <Link href={`/dashboard/${userSlug}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                                    <div style={{ width: 20, height: 20, borderRadius: 5, background: text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: isLight ? '#fff' : '#0a0a0a' }} />
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: text, letterSpacing: '-0.015em' }}>Palm</span>
                                </Link>
                                <button
                                    onClick={() => dispatch(toggleSidebar())}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4, display: 'flex', borderRadius: 6, transition: 'color 0.12s' }}
                                    onMouseEnter={e => e.currentTarget.style.color = text}
                                    onMouseLeave={e => e.currentTarget.style.color = muted}
                                >
                                    <PanelLeft style={{ width: 14, height: 14 }} />
                                </button>
                            </div>

                            {/* ── Nav ── */}
                            <div style={{ padding: '28px 10px 0', flexShrink: 0 }}>
                                {[
                                    { icon: <Home style={{ width: 13, height: 13 }} />, label: 'Home', v: 'home' },
                                    { icon: <LayoutGrid style={{ width: 13, height: 13 }} />, label: 'Projects', v: 'projects' },
                                    ...((hasDeleted || hasDeletedOptimistic) ? [{ icon: <Trash2 style={{ width: 13, height: 13 }} />, label: 'Trash', v: 'trash' }] : []),
                                ].map(({ icon, label, v }) => {
                                    const active = view === v
                                    return (
                                        <button
                                            key={v}
                                            onClick={() => router.push(v === 'home' ? `/dashboard/${userSlug}` : `/dashboard/${userSlug}/${v}`)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                                                padding: '8px 10px', borderRadius: 8, border: 'none',
                                                background: active ? (isLight ? 'rgba(0,0,0,0.055)' : 'rgba(255,255,255,0.07)') : 'transparent',
                                                color: active ? text : muted,
                                                fontSize: 13, fontWeight: active ? 500 : 400,
                                                cursor: 'pointer', textAlign: 'left',
                                                letterSpacing: '-0.012em',
                                                transition: 'background 0.12s, color 0.12s',
                                                marginBottom: 1,
                                            }}
                                            onMouseEnter={e => {
                                                if (!active) {
                                                    e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.04)'
                                                    e.currentTarget.style.color = text
                                                }
                                            }}
                                            onMouseLeave={e => {
                                                if (!active) {
                                                    e.currentTarget.style.background = 'transparent'
                                                    e.currentTarget.style.color = muted
                                                }
                                            }}
                                        >
                                            {icon}{label}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* ── Divider + Recent label / Empty state ── */}
                            {projects.length > 0 ? (
                                <>
                                    <div style={{ padding: '28px 18px 10px', flexShrink: 0 }}>
                                        <div style={{ height: 1, background: border, marginBottom: 16 }} />
                                        <p style={{
                                            fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                                            color: muted, margin: 0,
                                        }}>
                                            Recent
                                        </p>
                                    </div>

                                    {/* ── Project list ── */}
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 20px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                                        {projects.map(p => {
                                            const src = thumbnailToSrc(p.thumbnail)
                                            return (
                                                <Link
                                                    key={p._id}
                                                    href={`/dashboard/${userSlug}/canvas?project=${p._id}`}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                        padding: '7px 10px', borderRadius: 8,
                                                        textDecoration: 'none',
                                                        transition: 'background 0.12s',
                                                        marginBottom: 1,
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    {/* Thumbnail */}
                                                    <div style={{
                                                        width: 30, height: 30, borderRadius: 7, overflow: 'hidden',
                                                        flexShrink: 0, border: `1px solid ${border}`,
                                                    }}>
                                                        {src
                                                            ? <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                                            : <div style={{ width: '100%', height: '100%', background: p.thumbnail || '#888' }} />
                                                        }
                                                    </div>

                                                    {/* Text */}
                                                    <div style={{ minWidth: 0 }}>
                                                        <p style={{
                                                            fontSize: 12, fontWeight: 400, margin: 0, color: text,
                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                            letterSpacing: '-0.01em', lineHeight: 1.35,
                                                        }}>
                                                            {p.name}
                                                        </p>
                                                        <p style={{
                                                            fontSize: 10, margin: '2px 0 0', color: muted,
                                                            opacity: 0.55, letterSpacing: '0em',
                                                        }}>
                                                            {formatDistanceToNow(new Date(p.lastModified), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                </>
                            ) : (
                                <div style={{ padding: '24px 18px', flexShrink: 0 }}>
                                    <div style={{ height: 1, background: border, marginBottom: 14 }} />
                                    <p style={{
                                        fontSize: 12,
                                        color: muted,
                                        margin: 0,
                                        letterSpacing: '-0.01em',
                                    }}>
                                        No projects yet
                                    </p>
                                </div>
                            )}
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* ── Main ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', zIndex: 10, marginLeft: sideOpen ? 240 : 0, transition: 'margin-left 0.22s ease' }}>

                    {/* Topbar */}
                    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', flexShrink: 0 }}>
                        {/* Left */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {/* Mobile menu */}
                            <button className="md:hidden" onClick={() => setIsMobileDrawerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4 }}>
                                <PanelLeft style={{ width: 16, height: 16 }} />
                            </button>

                            {/* Sidebar toggle */}
                            {!sideOpen && (
                                <GlassTooltip content="Open sidebar" side="right">
                                    <button
                                        onClick={() => dispatch(toggleSidebar())}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4, alignItems: 'center' }}
                                        className="hidden md:flex"
                                    >
                                        <PanelLeft style={{ width: 15, height: 15 }} />
                                    </button>
                                </GlassTooltip>
                            )}

                            {/* Logo — only on home when sidebar is closed */}
                            {!sideOpen && (
                                <Link href={`/dashboard/${userSlug}`} style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none' }}>
                                    <div style={{ width: 20, height: 20, borderRadius: 5, background: text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: isLight ? '#fff' : '#0a0a0a' }} />
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: text, letterSpacing: '-0.01em' }}>Palm</span>
                                </Link>
                            )}
                        </div>

                        {/* Right */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {creditBalance !== undefined && (
                                <Link
                                    href={`/billing/${userSlug}`}
                                    title="View credits & billing"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        height: 30,
                                        padding: '0 10px 0 9px',
                                        borderRadius: 9999,
                                        border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.09)'}`,
                                        background: isLight ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.05)',
                                        boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.02)' : '0 1px 2px rgba(0,0,0,0.2)',
                                        textDecoration: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'
                                        e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.18)'
                                        e.currentTarget.style.transform = 'translateY(-0.5px)'
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.05)'
                                        e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.09)'
                                        e.currentTarget.style.transform = 'translateY(0)'
                                    }}
                                >
                                    <PalmLeafIcon color={isLight ? '#0a0a0a' : '#ffffff'} />
                                    <span style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: text,
                                        fontVariantNumeric: 'tabular-nums',
                                        letterSpacing: '-0.01em',
                                    }}>
                                        {creditBalance}
                                    </span>
                                    <span style={{
                                        fontSize: 11,
                                        fontWeight: 450,
                                        color: isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)',
                                        letterSpacing: '-0.01em',
                                    }}>
                                        credits
                                    </span>
                                </Link>
                            )}
                            <AvatarDropdown creditBalance={creditBalance ?? 0} />
                        </div>
                    </header>

                    {/* Content */}
                    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: view === 'home' ? 'center' : 'flex-start', padding: view === 'home' ? '0 24px 80px' : '32px 24px 80px' }}>

                        {view === 'projects' ? (
                            <div style={{ width: '100%', maxWidth: 1200 }}>
                                <ProjectsList onProjectDelete={() => setHasDeletedOptimistic(true)} />
                            </div>
                        ) : view === 'trash' ? (
                            <TrashList onTrashEmpty={() => setHasDeletedOptimistic(false)} />
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                            >
                                {/* Greeting */}
                                <p style={{ fontSize: 13, color: muted, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                                    Hi, {me.name?.split(' ')[0] ?? 'there'}.
                                </p>
                                <h1 style={{ fontSize: 28, fontWeight: 600, color: text, margin: '0 0 20px', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
                                    What will you build today?
                                </h1>

                                {/* Jump back in — recent projects row */}
                                {projects.length > 0 && (
                                    <div style={{ width: '100%', maxWidth: 640, marginBottom: 14 }}>
                                        <p style={{
                                            fontSize: 11, color: muted, letterSpacing: '0.08em',
                                            textTransform: 'uppercase', margin: '0 0 8px',
                                        }}>
                                            Jump back in
                                        </p>

                                        {/* Scroll container */}
                                        <div style={{ position: 'relative' }}>
                                            <div style={{
                                                display: 'flex', gap: 6, overflowX: 'auto',
                                                scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
                                                paddingBottom: 2,
                                            }}>
                                                {projects.slice(0, 3).map(p => {
                                                    const src = thumbnailToSrc(p.thumbnail)
                                                    const isSelected = selectedProject?._id === p._id
                                                    return (
                                                        <button
                                                            key={p._id}
                                                            onClick={() => setSelectedProject(isSelected ? null : { _id: p._id, name: p.name })}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
                                                                padding: '5px 10px 5px 7px', borderRadius: 20,
                                                                border: `1px solid ${isSelected
                                                                    ? (isLight ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.28)')
                                                                    : border}`,
                                                                background: isSelected
                                                                    ? (isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.09)')
                                                                    : (isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)'),
                                                                color: isSelected ? text : muted,
                                                                fontSize: 12, fontWeight: isSelected ? 500 : 400,
                                                                cursor: 'pointer', letterSpacing: '-0.01em',
                                                                whiteSpace: 'nowrap',
                                                                transition: 'all 0.15s ease',
                                                            }}
                                                        >
                                                            {src
                                                                ? <img src={src} style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0 }} alt="" />
                                                                : <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, background: p.thumbnail || '#888' }} />
                                                            }
                                                            {p.name}
                                                            {isSelected && (
                                                                <X
                                                                    style={{ width: 11, height: 11, marginLeft: 2, opacity: 0.5 }}
                                                                    onClick={e => { e.stopPropagation(); setSelectedProject(null) }}
                                                                />
                                                            )}
                                                        </button>
                                                    )
                                                })}
                                            </div>

                                            {/* Fade-out right edge */}
                                            <div style={{
                                                position: 'absolute', right: 0, top: 0, bottom: 0, width: 32, pointerEvents: 'none',
                                                background: `linear-gradient(to right, transparent, ${isLight ? '#fafafa' : '#0a0a0a'})`,
                                            }} />
                                        </div>
                                    </div>
                                )}

                                {/* ── Input Card ── */}
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

                                            {/* Selected project tag */}
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

                                            {/* Image previews */}
                                            <ImagePreview images={uploadedImages} onRemove={handleRemoveImage} isLight={isLight} />

                                            {/* URL tags */}
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

                                            {/* Textarea */}
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

                                            {/* Toolbar */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>

                                                {/* Attachment */}
                                                <AttachmentMenu
                                                    onUpload={handleUpload}
                                                    onUrl={() => setUrlMode(true)}
                                                    onEnhance={handleEnhance}
                                                    enhancing={enhancing}
                                                    hasInput={!!prompt.trim()}
                                                    isLight={isLight}
                                                />

                                                {/* URL input mode */}
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
                                                            {/* Mic */}
                                                            <MicButton
                                                                onTranscript={t => {
                                                                    console.log('[STT] received:', t)
                                                                    setPrompt(p => p ? p + ' ' + t : t)
                                                                }}
                                                                onRecordingChange={setIsRecordingActive}
                                                                onStateChange={setMicState}
                                                                disabled={isLoading}
                                                            />

                                                            {/* Send — always visible */}
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
                                                                    ? <div style={{ width: 13, height: 13, borderTop: '2px solid transparent', borderRight: `2px solid ${isLight ? (prompt.trim() ? '#fff' : 'rgba(0,0,0,0.3)') : (prompt.trim() ? '#000' : 'rgba(255,255,255,0.3)')}`, borderBottom: `2px solid ${isLight ? (prompt.trim() ? '#fff' : 'rgba(0,0,0,0.3)') : (prompt.trim() ? '#000' : 'rgba(255,255,255,0.3)')}`, borderLeft: `2px solid ${isLight ? (prompt.trim() ? '#fff' : 'rgba(0,0,0,0.3)') : (prompt.trim() ? '#000' : 'rgba(255,255,255,0.3)')}`, borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
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

                                {/* Category chips */}
                                <div style={{
                                    position: 'relative', width: '100%', maxWidth: 640, marginTop: 14,
                                }}>
                                    <div style={{
                                        display: 'flex', gap: 6, overflowX: 'auto',
                                        scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
                                        paddingBottom: 2,
                                    }}>
                                        {CATEGORIES.map((c, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setPrompt(c.prompt)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                                                    padding: '6px 12px', borderRadius: 8,
                                                    border: `1px solid ${border}`,
                                                    background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
                                                    color: isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)',
                                                    fontSize: 13, cursor: 'pointer', letterSpacing: '-0.01em',
                                                    whiteSpace: 'nowrap',
                                                    transition: 'background 0.12s, color 0.12s, border-color 0.12s',
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)'
                                                    e.currentTarget.style.color = text
                                                    e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)'
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)'
                                                    e.currentTarget.style.color = isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)'
                                                    e.currentTarget.style.borderColor = border
                                                }}
                                            >
                                                <span style={{ opacity: 0.55, display: 'flex', alignItems: 'center' }}>{c.icon}</span>
                                                {c.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Fade-out right edge */}
                                    <div style={{
                                        position: 'absolute', right: 0, top: 0, bottom: 0, width: 32, pointerEvents: 'none',
                                        background: `linear-gradient(to right, transparent, ${isLight ? '#fafafa' : '#0a0a0a'})`,
                                    }} />
                                </div>
                            </motion.div>
                        )}
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

function PalmLeafIcon({ color, size = 13 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.9 }}>
            <path d="M8 14.5V7.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M8 7.5C8 7.5 3.8 6.5 2.8 3.5C5.3 3 8 4.8 8 7.5Z" fill={color} fillOpacity="0.85" />
            <path d="M8 7.5C8 7.5 12.2 6.5 13.2 3.5C10.7 3 8 4.8 8 7.5Z" fill={color} fillOpacity="0.85" />
            <path d="M8 7.5C8 7.5 6.8 3.5 9 1.5C10.5 3 10 5.5 8 7.5Z" fill={color} fillOpacity="0.95" />
            <path d="M8 8.8C8 8.8 4.8 9.3 3.8 7.2C5.8 6.2 8 7.8 8 8.8Z" fill={color} fillOpacity="0.7" />
            <path d="M8 8.8C8 8.8 11.2 9.3 12.2 7.2C10.2 6.2 8 7.8 8 8.8Z" fill={color} fillOpacity="0.7" />
        </svg>
    )
}