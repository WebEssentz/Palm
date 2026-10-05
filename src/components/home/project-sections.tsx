'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Folder, ChevronDown, Plus, MoreHorizontal, Check, Lock } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { ProjectVisibilityTab } from './project-toolbar'
import { CreateFolderModal } from '@/components/projects/modals/create-folder-modal'
import ProjectCard from './project-actions/project-card'
import MultiSelectBar from './project-actions/multi-select-bar'
import { ProjectActionItem, FolderOptionItem } from './project-actions/types'
import { FolderMenu } from './folders/folder-menu'
import { RenameFolderModal } from './folders/rename-folder-modal'
import { DeleteFolderModal } from './folders/delete-folder-modal'

export type ProjectItem = ProjectActionItem

export interface FolderItem {
    _id: string
    name: string
    projectCount: number
    color?: string
    emoji?: string
}

interface ProjectSectionsProps {
    projects: ProjectActionItem[]
    activeTab: ProjectVisibilityTab
    searchQuery: string
    userSlug: string
    isLight: boolean
    text: string
    muted: string
    border: string
    onNewProject: (visibility?: ProjectVisibilityTab) => void
    selectedColor?: string
}

export default function ProjectSections({
    projects,
    activeTab,
    searchQuery,
    userSlug,
    isLight,
    text,
    muted,
    border,
    onNewProject,
    selectedColor,
}: ProjectSectionsProps) {
    const [mounted, setMounted] = useState(false)
    const [foldersOpen, setFoldersOpen] = useState(true)
    const [projectsOpen, setProjectsOpen] = useState(true)
    const [folderModalOpen, setFolderModalOpen] = useState(false)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [optimisticallyDeletedIds, setOptimisticallyDeletedIds] = useState<Set<string>>(new Set())
    const [toastMessage, setToastMessage] = useState<string | null>(null)
    const toastTimerRef = useRef<NodeJS.Timeout | null>(null)

    // Folder actions state
    const [activeMenuFolderId, setActiveMenuFolderId] = useState<string | null>(null)
    const [renameModalFolder, setRenameModalFolder] = useState<FolderOptionItem | null>(null)
    const [deleteModalFolder, setDeleteModalFolder] = useState<FolderOptionItem | null>(null)
    const [optimisticallyDeletedFolderIds, setOptimisticallyDeletedFolderIds] = useState<Set<string>>(new Set())

    // Ref map: folder _id → trigger button element (for portal positioning)
    const folderTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})

    useEffect(() => {
        setMounted(true)
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        }
    }, [])

    // Convex queries and mutations
    const dbFolders = useQuery(api.folders.getUserFolders) ?? []
    const createFolderMutation = useMutation(api.folders.createFolder)
    const renameFolderMutation = useMutation(api.folders.renameFolder)
    const deleteFolderMutation = useMutation(api.folders.deleteFolder)
    const updateFolderColorMutation = useMutation(api.folders.updateFolderColor)
    const updateFolderEmojiMutation = useMutation(api.folders.updateFolderEmoji)
    const duplicateProjectsMutation = useMutation(api.projects.duplicateProjects)
    const moveProjectsToFolderMutation = useMutation(api.projects.moveProjectsToFolder)
    const togglePinProjectsMutation = useMutation(api.projects.togglePinProjects)
    const deleteProjectsMutation = useMutation(api.projects.deleteProjects)

    const folderItems: FolderOptionItem[] = dbFolders
        .filter(f => !optimisticallyDeletedFolderIds.has(f._id))
        .map(f => ({
            _id: f._id,
            name: f.name,
            projectCount: f.projectCount,
            color: (f as any).color,
            emoji: (f as any).emoji,
        }))

    // Use projects from database
    const realProjects: ProjectActionItem[] = projects.map(p => ({
        _id: p._id,
        name: p.name,
        lastModified: p.lastModified,
        thumbnail: p.thumbnail,
        visibility: p.visibility ?? 'workspace',
        folderId: p.folderId,
        authorName: p.authorName,
        isPinned: p.isPinned,
        projectNumber: p.projectNumber,
    }))

    // Filter projects, excluding any optimistically deleted
    const filteredProjects = realProjects.filter((item) => {
        if (optimisticallyDeletedIds.has(item._id)) return false

        const matchesTab =
            activeTab === 'all'
                ? true
                : activeTab === 'private'
                ? item.visibility === 'private'
                : item.visibility !== 'private'

        const matchesSearch =
            !searchQuery.trim() ||
            item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())

        return matchesTab && matchesSearch
    })

    const showToast = (message: string) => {
        setToastMessage(message)
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        toastTimerRef.current = setTimeout(() => {
            setToastMessage(null)
        }, 3500)
    }

    const handleCreateFolder = async (name: string) => {
        try {
            await createFolderMutation({ name })
            showToast(`Folder "${name}" created`)
        } catch (err) {
            console.error('Failed to create folder', err)
        }
    }

    const handleRenameFolder = async (folderId: string, newName: string) => {
        try {
            await renameFolderMutation({ folderId: folderId as any, name: newName })
        } catch (err) {
            console.error('Failed to rename folder', err)
        }
    }

    const handleDeleteFolder = async (folderId: string) => {
        setOptimisticallyDeletedFolderIds(prev => new Set([...prev, folderId]))
        showToast('Successfully deleted a folder')

        try {
            await deleteFolderMutation({ folderId: folderId as any })
        } catch (err) {
            console.error('Failed to delete folder', err)
            setOptimisticallyDeletedFolderIds(prev => {
                const next = new Set(prev)
                next.delete(folderId)
                return next
            })
        }
    }

    const handleSelectFolderColor = async (folderId: string, color: string | undefined) => {
        try {
            await updateFolderColorMutation({ folderId: folderId as any, color })
        } catch (err) {
            console.error('Failed to update folder color', err)
        }
    }

    const handleSelectFolderEmoji = async (folderId: string, emoji: string | undefined) => {
        try {
            await updateFolderEmojiMutation({ folderId: folderId as any, emoji })
        } catch (err) {
            console.error('Failed to update folder emoji', err)
        }
    }

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const handleDeselectAll = () => {
        setSelectedIds([])
    }

    // Determine if all selected projects are pinned
    const isAllPinned =
        selectedIds.length > 0 &&
        selectedIds.every(id => {
            const item = realProjects.find(p => p._id === id)
            return !!item?.isPinned
        })

    const handleDuplicate = async () => {
        if (selectedIds.length === 0) return
        await duplicateProjectsMutation({ projectIds: selectedIds as any })
        setSelectedIds([])
    }

    const handleMoveToFolder = async (folderId: string | null) => {
        if (selectedIds.length === 0) return
        await moveProjectsToFolderMutation({
            projectIds: selectedIds as any,
            folderId: folderId ? (folderId as any) : undefined,
        })
        setSelectedIds([])
    }

    const handleTogglePin = async () => {
        if (selectedIds.length === 0) return
        await togglePinProjectsMutation({
            projectIds: selectedIds as any,
            pinned: !isAllPinned,
        })
    }

    const handleDelete = async () => {
        if (selectedIds.length === 0) return
        const idsToDelete = [...selectedIds]
        const count = idsToDelete.length

        // Optimistically remove immediately from UI
        setOptimisticallyDeletedIds(prev => new Set([...prev, ...idsToDelete]))
        setSelectedIds([])

        // Trigger the toast alert
        showToast(count === 1 ? 'Successfully deleted a project' : `Successfully deleted ${count} projects`)

        // Fire mutation in background
        try {
            await deleteProjectsMutation({ projectIds: idsToDelete as any })
        } catch (err) {
            console.error('Delete failed', err)
            // Rollback optimistic state if mutation fails
            setOptimisticallyDeletedIds(prev => {
                const next = new Set(prev)
                idsToDelete.forEach(id => next.delete(id))
                return next
            })
        }
    }

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* ── SECTION 1: Folders ── */}
            <div style={{ width: '100%' }}>
                {/* Header Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                    <button
                        onClick={() => setFoldersOpen(!foldersOpen)}
                        type="button"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            color: text,
                        }}
                    >
                        <span style={{ fontSize: 16, fontWeight: 650, letterSpacing: '-0.02em' }}>
                            Folders
                        </span>
                        <span
                            style={{
                                fontSize: 12,
                                fontWeight: 500,
                                padding: '1px 7px',
                                borderRadius: 10,
                                background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                                color: muted,
                            }}
                        >
                            {folderItems.length}
                        </span>
                        <ChevronDown
                            style={{
                                width: 15,
                                height: 15,
                                color: muted,
                                transform: foldersOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                                transition: 'transform 0.18s ease',
                            }}
                        />
                    </button>
                </div>

                {/* Folders List */}
                <AnimatePresence initial={false}>
                    {foldersOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                                    gap: 16,
                                    paddingTop: 2,
                                }}
                            >
                                {/* Add Folder Card */}
                                <div
                                    onClick={() => setFolderModalOpen(true)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 14,
                                        height: 68,
                                        padding: '0 18px',
                                        borderRadius: 14,
                                        border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.09)'}`,
                                        background: isLight ? 'rgba(0,0,0,0.015)' : 'rgba(255,255,255,0.02)',
                                        cursor: 'pointer',
                                        transition: 'all 0.14s ease',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.22)'
                                        e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)'
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.09)'
                                        e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.015)' : 'rgba(255,255,255,0.02)'
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 9,
                                            background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Plus style={{ width: 17, height: 17, color: muted }} />
                                    </div>
                                    <span style={{ fontSize: 14, fontWeight: 550, color: text, letterSpacing: '-0.01em' }}>
                                        Add Folder
                                    </span>
                                </div>

                                {/* Folder Cards */}
                                {folderItems.map(f => (
                                    <div
                                        key={f._id}
                                        style={{
                                            position: 'relative',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            height: 68,
                                            padding: '0 10px 0 18px',
                                            borderRadius: 14,
                                            border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.09)'}`,
                                            background: isLight ? '#ffffff' : '#141414',
                                            cursor: 'pointer',
                                            transition: 'border-color 0.14s ease',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.22)'
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.09)'
                                        }}
                                    >
                                        {/* Left: Icon + Name + Count */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                                            {/* Folder Icon: emoji + color bg */}
                                            <div
                                                style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: 9,
                                                    background: f.color
                                                        ? f.color + '28'
                                                        : (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)'),
                                                    border: f.color ? `1px solid ${f.color}40` : 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    transition: 'background 0.18s ease, border-color 0.18s ease',
                                                }}
                                            >
                                                {f.emoji ? (
                                                    <span style={{ fontSize: 17, lineHeight: 1 }}>{f.emoji}</span>
                                                ) : (
                                                    <Folder
                                                        style={{
                                                            width: 17,
                                                            height: 17,
                                                            color: f.color ?? muted,
                                                            transition: 'color 0.18s ease',
                                                        }}
                                                    />
                                                )}
                                            </div>

                                            {/* Name + count */}
                                            <div style={{ minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        fontSize: 14,
                                                        fontWeight: 600,
                                                        color: text,
                                                        letterSpacing: '-0.01em',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {f.name}
                                                </div>
                                                <div style={{ fontSize: 12, color: muted, marginTop: 1 }}>
                                                    {f.projectCount ?? 0} {f.projectCount === 1 ? 'project' : 'projects'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: More button + Context Menu */}
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <button
                                                type="button"
                                                ref={(element) => {
                                                    folderTriggerRefs.current[f._id] = element
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setActiveMenuFolderId(prev => prev === f._id ? null : f._id)
                                                }}
                                                aria-label="Folder options"
                                                style={{
                                                    background: activeMenuFolderId === f._id
                                                        ? (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)')
                                                        : 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: activeMenuFolderId === f._id ? text : muted,
                                                    padding: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: 7,
                                                    transition: 'background 0.12s ease, color 0.12s ease',
                                                }}
                                                onMouseEnter={e => {
                                                    if (activeMenuFolderId !== f._id) {
                                                        e.currentTarget.style.color = text
                                                        e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'
                                                    }
                                                }}
                                                onMouseLeave={e => {
                                                    if (activeMenuFolderId !== f._id) {
                                                        e.currentTarget.style.color = muted
                                                        e.currentTarget.style.background = 'transparent'
                                                    }
                                                }}
                                            >
                                                <MoreHorizontal style={{ width: 16, height: 16 }} />
                                            </button>

                                            {/* Context Menu */}
                                            <FolderMenu
                                                isOpen={activeMenuFolderId === f._id}
                                                triggerElement={folderTriggerRefs.current[f._id] ?? null}
                                                onClose={() => setActiveMenuFolderId(null)}
                                                onOpenRename={() => setRenameModalFolder(f)}
                                                onOpenDelete={() => setDeleteModalFolder(f)}
                                                onSelectColor={(color) => handleSelectFolderColor(f._id, color)}
                                                onSelectEmoji={(emoji) => handleSelectFolderEmoji(f._id, emoji)}
                                                currentColor={f.color}
                                                currentEmoji={f.emoji}
                                                isLight={isLight}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── SECTION 2: Projects ── */}
            <div style={{ width: '100%' }}>
                {/* Header Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <button
                        onClick={() => setProjectsOpen(!projectsOpen)}
                        type="button"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            color: text,
                        }}
                    >
                        <span style={{ fontSize: 16, fontWeight: 655, letterSpacing: '-0.02em' }}>
                            Projects
                        </span>
                        <span
                            style={{
                                fontSize: 12,
                                fontWeight: 500,
                                padding: '1px 7px',
                                borderRadius: 10,
                                background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                                color: muted,
                            }}
                        >
                            {filteredProjects.length}
                        </span>
                        <ChevronDown
                            style={{
                                width: 15,
                                height: 15,
                                color: muted,
                                transform: projectsOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                                transition: 'transform 0.18s ease',
                            }}
                        />
                    </button>
                </div>

                {/* Projects Grid with Smooth Reflow Animation */}
                <AnimatePresence initial={false}>
                    {projectsOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden' }}
                        >
                            {filteredProjects.length === 0 ? (
                                activeTab === 'private' ? (
                                    /* ── Distinct, High-Quality No Private Projects UI ── */
                                    <motion.div
                                        key="empty-private"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 8 }}
                                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                        style={{
                                            width: '100%',
                                            padding: '60px 24px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            textAlign: 'center',
                                            boxSizing: 'border-box',
                                        }}
                                    >
                                        {/* Frosted lock badge */}
                                        <div
                                            style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 14,
                                                background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginBottom: 16,
                                                boxShadow: isLight
                                                    ? '0 6px 16px rgba(0,0,0,0.03)'
                                                    : '0 6px 20px rgba(0,0,0,0.4)',
                                            }}
                                        >
                                            <Lock style={{ width: 20, height: 20, color: text, strokeWidth: 2 }} />
                                        </div>

                                        {/* Title */}
                                        <h3
                                            style={{
                                                fontSize: 17,
                                                fontWeight: 650,
                                                color: text,
                                                letterSpacing: '-0.02em',
                                                margin: '0 0 6px',
                                            }}
                                        >
                                            No private projects yet
                                        </h3>

                                        {/* Description */}
                                        <p
                                            style={{
                                                fontSize: 13.5,
                                                color: muted,
                                                maxWidth: 400,
                                                margin: '0 0 22px',
                                                lineHeight: 1.5,
                                                letterSpacing: '-0.005em',
                                            }}
                                        >
                                            There are no projects here. Get started by creating your first project.
                                        </p>

                                        {/* Action Button */}
                                        <button
                                            type="button"
                                            onClick={() => onNewProject('private')}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 7,
                                                padding: '9px 18px',
                                                borderRadius: 10,
                                                border: 'none',
                                                background: isLight ? '#0a0a0a' : '#ffffff',
                                                color: isLight ? '#ffffff' : '#0a0a0a',
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                boxShadow: isLight
                                                    ? '0 4px 14px rgba(0,0,0,0.12)'
                                                    : '0 4px 16px rgba(255,255,255,0.12)',
                                                transition: 'opacity 0.14s ease, transform 0.1s ease',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
                                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                                        >
                                            <Plus style={{ width: 15, height: 15, strokeWidth: 2.25 }} />
                                            <span>Create new project</span>
                                        </button>
                                    </motion.div>
                                ) : (
                                    /* ── Workspace / Public Empty State: Full-width dashed card ── */
                                    <div
                                        onClick={() => onNewProject(activeTab)}
                                        style={{
                                            width: '100%',
                                            padding: '48px 24px',
                                            borderRadius: 14,
                                            border: `1.5px dashed ${isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)'}`,
                                            background: isLight ? '#ffffff' : '#0a0a0a',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 12,
                                            cursor: 'pointer',
                                            transition: 'all 0.14s ease',
                                            boxSizing: 'border-box',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.borderColor = isLight ? '#000000' : '#ffffff'
                                            e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.015)' : 'rgba(255,255,255,0.02)'
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)'
                                            e.currentTarget.style.background = isLight ? '#ffffff' : '#0a0a0a'
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Plus style={{ width: 18, height: 18, color: text, strokeWidth: 2.25 }} />
                                        </div>
                                        <span style={{ fontSize: 14, fontWeight: 550, color: text, letterSpacing: '-0.01em' }}>
                                            Create your first project
                                        </span>
                                    </div>
                                )
                            ) : (
                                /* ── Projects Grid with FLIP layout animation for smooth card reflow on deletion ── */
                                <motion.div
                                    layout
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                                        gap: 20,
                                        paddingTop: 2,
                                    }}
                                >
                                    <AnimatePresence mode="popLayout">
                                        {filteredProjects.map((project) => (
                                            <motion.div
                                                key={project._id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.96 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{
                                                    opacity: 0,
                                                    scale: 0.85,
                                                    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                                                }}
                                                transition={{
                                                    layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                                                    opacity: { duration: 0.2 },
                                                }}
                                                style={{ width: '100%' }}
                                            >
                                                <ProjectCard
                                                    project={project}
                                                    userSlug={userSlug}
                                                    isLight={isLight}
                                                    text={text}
                                                    muted={muted}
                                                    border={border}
                                                    isSelected={selectedIds.includes(project._id)}
                                                    isSelectionActive={selectedIds.length > 0}
                                                    onToggleSelect={handleToggleSelect}
                                                    selectedColor={selectedColor}
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Floating Multi-Select Action Bar ── */}
            <MultiSelectBar
                selectedIds={selectedIds}
                onDeselectAll={handleDeselectAll}
                onDuplicate={handleDuplicate}
                onMoveToFolder={handleMoveToFolder}
                onTogglePin={handleTogglePin}
                onDelete={handleDelete}
                isAllPinned={isAllPinned}
                folders={folderItems}
                isLight={isLight}
                text={text}
                muted={muted}
                border={border}
            />

            {/* Create Folder Modal */}
            <CreateFolderModal
                isOpen={folderModalOpen}
                onClose={() => setFolderModalOpen(false)}
                onCreate={handleCreateFolder}
                isLight={isLight}
                text={text}
                muted={muted}
                border={border}
            />

            {/* Rename Folder Modal */}
            <RenameFolderModal
                isOpen={renameModalFolder !== null}
                currentName={renameModalFolder?.name ?? ''}
                onClose={() => setRenameModalFolder(null)}
                onRename={(newName) => {
                    if (renameModalFolder) return handleRenameFolder(renameModalFolder._id, newName)
                }}
                isLight={isLight}
            />

            {/* Delete Folder Modal */}
            <DeleteFolderModal
                isOpen={deleteModalFolder !== null}
                folderName={deleteModalFolder?.name ?? ''}
                onClose={() => setDeleteModalFolder(null)}
                onConfirm={() => {
                    if (deleteModalFolder) return handleDeleteFolder(deleteModalFolder._id)
                }}
                isLight={isLight}
            />

            {/* ── Fixed Top-Center Deletion Toast Portal (Above Everything) ── */}
            {mounted && createPortal(
                <AnimatePresence>
                    {toastMessage && (
                        <div
                            style={{
                                position: 'fixed',
                                top: 24,
                                left: 0,
                                right: 0,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                zIndex: 999999,
                                pointerEvents: 'none',
                            }}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: -24, scale: 0.94 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -18, scale: 0.94 }}
                                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                style={{
                                    pointerEvents: 'auto',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 9,
                                    padding: '8px 16px 8px 12px',
                                    borderRadius: 12,
                                    background: isLight ? '#1c1c1e' : '#1e1e20',
                                    color: '#ffffff',
                                    border: '1px solid rgba(255, 255, 255, 0.14)',
                                    boxShadow: '0 14px 40px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.25)',
                                    fontSize: 13.5,
                                    fontWeight: 500,
                                    letterSpacing: '-0.01em',
                                    userSelect: 'none',
                                }}
                            >
                                <div
                                    style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: '50%',
                                        background: 'rgba(255, 255, 255, 0.16)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    <Check style={{ width: 12, height: 12, color: '#ffffff', strokeWidth: 2.75 }} />
                                </div>
                                <span>{toastMessage}</span>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    )
}
