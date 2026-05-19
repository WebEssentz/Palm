'use client'

import { useAppSelector } from '@/redux/store'
import { Plus, RotateCcw, Trash2, Search, MoreVertical, CheckSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useTheme } from 'next-themes'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { usePalmToast } from '@/hooks/use-palmtoast'
import { DeleteConfirmationDialog } from './modals/delete-confirmation-dialog'
import { TrashSelectionBar } from './trash-selection-bar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function isColorDark(color: string | undefined): boolean {
    const hex = (color?.match(/#[a-fA-F0-9]{6}/) || [])[0]
    if (!hex) return true
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance < 0.35
}

function calculateRemainingTime(deletedAtMs: number): { text: string; isExpired: boolean } {
    const now = Date.now()
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
    const expiresAt = deletedAtMs + THREE_DAYS_MS
    const remaining = expiresAt - now

    if (remaining <= 0) return { text: '0h left', isExpired: true }

    const days = Math.floor(remaining / (24 * 60 * 60 * 1000))
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))

    if (days > 0) return { text: `${days}d left`, isExpired: false }
    if (hours > 0) return { text: `${hours}h left`, isExpired: false }
    return { text: `${minutes}m left`, isExpired: false }
}

const TrashList = ({ onTrashEmpty }: { onTrashEmpty?: () => void }) => {
    const user = useAppSelector((state) => state.profile)
    const { theme, systemTheme } = useTheme()
    const { toast } = usePalmToast()

    const effectiveTheme = theme === 'system' ? systemTheme : theme
    const isLightMode = effectiveTheme === 'light'

    const deletedProjects = useQuery(
        api.projects.getDeletedProjects,
        user?.id ? { userId: user.id as Id<'users'> } : 'skip'
    )

    const deleteAllMutation      = useMutation(api.projects.deleteAllDeletedProjects)
    const restoreProjectMutation = useMutation(api.projects.restoreProject)
    const permanentlyDeleteMutation = useMutation(api.projects.permanentlyDeleteProject)
    const softDeleteMutation     = useMutation(api.projects.deleteProject)

    // Core state
    const [visibleProjects, setVisibleProjects] = useState<any[]>([])
    const [timings, setTimings] = useState<Record<string, { text: string; isExpired: boolean }>>({})
    const [fadingOut, setFadingOut] = useState<Set<string>>(new Set())
    const [optimisticallyRemovedIds, setOptimisticallyRemovedIds] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')

    // Dialog state
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    // Select mode state
    const [selectMode, setSelectMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false)
    const [isDeletingSelected, setIsDeletingSelected] = useState(false)

    // ── Effects ──────────────────────────────────────────────

    useEffect(() => {
        if (deletedProjects) {
            setVisibleProjects(deletedProjects)
            const newTimings: Record<string, any> = {}
            deletedProjects.forEach((project: any) => {
                if (project.deleted_at) {
                    newTimings[project._id] = calculateRemainingTime(project.deleted_at)
                }
            })
            setTimings(newTimings)
        }
    }, [deletedProjects])

    useEffect(() => {
        if (visibleProjects.length === 0) return

        const interval = setInterval(() => {
            setVisibleProjects((prev) => {
                const updated = prev.filter((project: any) => {
                    if (!project.deleted_at) return true
                    const timing = calculateRemainingTime(project.deleted_at)

                    if (timing.isExpired && !fadingOut.has(project._id)) {
                        setFadingOut((prev) => new Set([...prev, project._id]))
                        setTimeout(() => {
                            setVisibleProjects((p) => p.filter((pr: any) => pr._id !== project._id))
                            setFadingOut((prev) => { const n = new Set(prev); n.delete(project._id); return n })
                            setTimings((prev) => { const n = { ...prev }; delete n[project._id]; return n })
                            // Also remove from selection if expired
                            setSelectedIds((prev) => { const n = new Set(prev); n.delete(project._id); return n })
                        }, 500)
                        return false
                    }
                    return true
                })

                const newTimings: Record<string, any> = {}
                updated.forEach((project: any) => {
                    if (project.deleted_at) {
                        newTimings[project._id] = calculateRemainingTime(project.deleted_at)
                    }
                })
                setTimings(newTimings)
                return updated
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [visibleProjects.length, fadingOut])

    useEffect(() => {
        if (visibleProjects.length === 0 && optimisticallyRemovedIds.size === 0 && onTrashEmpty) {
            onTrashEmpty()
        }
    }, [visibleProjects.length, optimisticallyRemovedIds.size, onTrashEmpty])

    // ── Handlers ─────────────────────────────────────────────

    const handleDeleteAll = async () => {
        setIsDeleting(true)
        try {
            await deleteAllMutation()
            setVisibleProjects([])
            setTimings({})
            setIsDeleteAllOpen(false)
            setSelectMode(false)
            setSelectedIds(new Set())
        } catch (error) {
            console.error('Failed to empty trash:', error)
        } finally {
            setIsDeleting(false)
        }
    }

    const handleDeleteClick = (projectId: string) => {
        setDeleteId(projectId)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteId) return
        const idToDelete = deleteId
        setOptimisticallyRemovedIds(prev => new Set([...prev, idToDelete]))
        setDeleteDialogOpen(false)
        setDeleteId(null)

        try {
            await permanentlyDeleteMutation({ projectId: idToDelete as any })
        } catch (err) {
            setOptimisticallyRemovedIds(prev => { const n = new Set(prev); n.delete(idToDelete); return n })
            console.error('Permanent delete failed:', err)
        }
    }

    const handleUndoRestore = async (projectId: string) => {
        const project = deletedProjects?.find(p => p._id === projectId)
        if (!project) return
        try {
            await softDeleteMutation({ projectId: projectId as any })
            setVisibleProjects(prev => [...prev, project])
            if (project.deleted_at) {
                setTimings(prev => ({ ...prev, [projectId]: calculateRemainingTime(project.deleted_at!) }))
            }
        } catch (err) {
            console.error('Undo restore failed:', err)
        }
    }

    const handleRestore = async (projectId: string) => {
        const project = visibleProjects.find(p => p._id === projectId)
        const projectName = project?.name || 'Project'

        setFadingOut(prev => new Set([...prev, projectId]))
        setTimeout(() => {
            setVisibleProjects(prev => prev.filter(p => p._id !== projectId))
            setFadingOut(prev => { const n = new Set(prev); n.delete(projectId); return n })
            setTimings(prev => { const n = { ...prev }; delete n[projectId]; return n })
        }, 500)

        toast(`${projectName} restored`, {
            type: 'success',
            action: { label: 'Undo', onClick: () => handleUndoRestore(projectId) }
        })

        try {
            await restoreProjectMutation({ projectId: projectId as any })
        } catch (err) {
            const revertProject = deletedProjects?.find(p => p._id === projectId)
            if (revertProject?.deleted_at) {
                setVisibleProjects(prev => [...prev, revertProject])
                setTimings(prev => ({ ...prev, [projectId]: calculateRemainingTime(revertProject.deleted_at!) }))
            }
            setFadingOut(prev => { const n = new Set(prev); n.delete(projectId); return n })
            console.error('Restore failed:', err)
        }
    }

    // Select mode handlers
    const handleEnterSelectMode = (projectId: string) => {
        setSelectMode(true)
        setSelectedIds(new Set([projectId]))
    }

    const toggleSelection = (projectId: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(projectId)) next.delete(projectId)
            else next.add(projectId)
            return next
        })
    }

    const handleSelectAll = () => {
        const ids = filteredProjects.map((p: any) => p._id)
        if (selectedIds.size === ids.length) setSelectedIds(new Set())
        else setSelectedIds(new Set(ids))
    }

    const handleCancelSelect = () => {
        setSelectMode(false)
        setSelectedIds(new Set())
    }

    const handleDeleteSelected = async () => {
        const idsToDelete = Array.from(selectedIds)
        setOptimisticallyRemovedIds(prev => new Set([...prev, ...idsToDelete]))
        setDeleteSelectedOpen(false)
        setSelectMode(false)
        setSelectedIds(new Set())
        setIsDeletingSelected(true)

        try {
            await Promise.all(idsToDelete.map(id =>
                permanentlyDeleteMutation({ projectId: id as any })
            ))
        } catch (err) {
            setOptimisticallyRemovedIds(prev => {
                const next = new Set(prev)
                idsToDelete.forEach(id => next.delete(id))
                return next
            })
            console.error('Delete selected failed:', err)
        } finally {
            setIsDeletingSelected(false)
        }
    }

    // ── Computed ──────────────────────────────────────────────

    const filteredProjects = visibleProjects
        .filter((project: any) => !optimisticallyRemovedIds.has(project._id))
        .filter((project: any) =>
            project.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
        )

    const filteredVisibleProjects = visibleProjects.filter(
        (project: any) => !optimisticallyRemovedIds.has(project._id)
    )

    // ── Glass style for buttons ──────────────────────────────

    const glassButtonStyle: React.CSSProperties = {
        backdropFilter: 'url(#palm-glass-light) blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: [
            '0 0 0 0.5px rgba(100,76,40,0.08)',
            '0 2px 4px rgba(80,60,30,0.06)',
            '0 8px 20px rgba(80,60,30,0.09)',
            'inset 0 1px 0 rgba(255,255,255,0.90)',
            'inset 0 -1px 0 rgba(100,76,40,0.04)',
        ].join(', '),
    }

    // ── Early returns ─────────────────────────────────────────

    if (deletedProjects === undefined || deletedProjects === null) {
        return (
            <div className='w-full max-w-7xl'>
                <div className='text-center py-20'>
                    <div className='animate-pulse text-muted-foreground text-sm'>Loading...</div>
                </div>
            </div>
        )
    }

    const isTrashEmpty = deletedProjects.length === 0 && visibleProjects.length === 0
    const hasAnyProjects = filteredVisibleProjects.length > 0

    if (isTrashEmpty || !hasAnyProjects) {
        return (
            <div className='w-full max-w-7xl'>
                <div className='text-center py-20'>
                    <div className='w-16 h-16 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center'>
                        <Plus className='w-8 h-8 text-muted-foreground' />
                    </div>
                    <h3 className='text-lg font-medium text-foreground mb-2'>Trash is empty</h3>
                    <p className='text-sm text-muted-foreground'>
                        Deleted projects appear here for 3 days before permanent removal
                    </p>
                </div>
            </div>
        )
    }

    // ── Render ────────────────────────────────────────────────

    return (
        <div className='w-full max-w-7xl mb-5'>
            <div className='space-y-8'>

                {/* Header */}
                <div className='flex items-start justify-between gap-4 flex-wrap'>
                    <div>
                        <h1 className='text-3xl font-semibold text-foreground'>Trash</h1>
                        <p className='text-muted-foreground mt-2'>
                            Items in Trash are permanently deleted after 3 days.
                        </p>
                    </div>
                    <div className='flex items-center gap-3 w-full max-w-md'>
                        {/* Search */}
                        <div
                            className='relative flex-1 h-10 rounded-full overflow-hidden bg-[rgba(250,246,238,0.88)] dark:bg-[rgba(255,255,255,0.07)] border border-[rgba(120,96,60,0.10)] dark:border-[rgba(255,255,255,0.12)]'
                            style={glassButtonStyle}
                        >
                            <Search className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                            <input
                                type='text'
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder='Search trash by name'
                                className='w-full h-full pl-10 pr-3 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground'
                            />
                        </div>

                        {/* Action button — context-aware */}
                        {selectMode ? (
                            <button
                                onClick={() => selectedIds.size > 0 && setDeleteSelectedOpen(true)}
                                disabled={selectedIds.size === 0}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap border',
                                    selectedIds.size > 0
                                        ? 'cursor-pointer text-red-500 border-red-500/20 bg-red-500/5 hover:bg-red-500/12'
                                        : 'cursor-not-allowed opacity-40 text-muted-foreground border-[rgba(120,96,60,0.10)] dark:border-[rgba(255,255,255,0.12)] bg-[rgba(250,246,238,0.88)] dark:bg-[rgba(255,255,255,0.07)]'
                                )}
                                style={selectedIds.size === 0 ? glassButtonStyle : {}}
                            >
                                <Trash2 className='w-4 h-4' />
                                {selectedIds.size > 0 ? `Delete (${selectedIds.size})` : 'Select items'}
                            </button>
                        ) : (
                            visibleProjects.length > 0 && (
                                <button
                                    onClick={() => setIsDeleteAllOpen(true)}
                                    disabled={isDeleting}
                                    className='px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 bg-[rgba(250,246,238,0.88)] dark:bg-[rgba(255,255,255,0.07)] border border-[rgba(120,96,60,0.10)] dark:border-[rgba(255,255,255,0.12)] text-foreground hover:text-foreground whitespace-nowrap'
                                    style={glassButtonStyle}
                                >
                                    <Trash2 className='w-4 h-4' />
                                    Empty Trash
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* Grid */}
                <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'>
                    {filteredProjects.length === 0 && searchQuery.trim() ? (
                        <div className='col-span-full text-center py-16'>
                            <p className='text-sm font-medium text-foreground mb-1'>
                                No results for "{searchQuery}"
                            </p>
                            <p className='text-xs text-muted-foreground'>Try a different name</p>
                        </div>
                    ) : (
                        filteredProjects.map((project: any) => {
                            const timing = timings[project._id]
                            const isFading = fadingOut.has(project._id)
                            const isSelected = selectedIds.has(project._id)

                            return (
                                <motion.div
                                    key={project._id}
                                    animate={{ rotate: selectMode && isSelected ? 2 : 0 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                    onClick={selectMode ? () => toggleSelection(project._id) : undefined}
                                    className={cn(
                                        'relative transition-opacity duration-300',
                                        isFading && 'opacity-0 scale-95 pointer-events-none',
                                        !isFading && !selectMode && 'opacity-75 hover:opacity-100 group cursor-pointer',
                                        !isFading && selectMode && isSelected && 'opacity-100 cursor-pointer',
                                        !isFading && selectMode && !isSelected && 'opacity-45 cursor-pointer',
                                    )}
                                >
                                    <div className='space-y-3'>
                                        <div className='aspect-[4/3] rounded-lg overflow-hidden bg-muted relative'>

                                            {/* Thumbnail */}
                                            <div
                                                className={cn(
                                                    'w-full h-full flex items-center justify-center transition-opacity',
                                                    !selectMode && 'group-hover:opacity-90'
                                                )}
                                                style={{
                                                    background: project.thumbnail
                                                        ? (!isLightMode && isColorDark(project.thumbnail)
                                                            ? '#ffffff'
                                                            : project.thumbnail)
                                                        : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)'
                                                }}
                                            >
                                                {!project.thumbnail && <Plus className='w-8 h-8 text-gray-400' />}
                                            </div>

                                            {/* Selection circle — top left */}
                                            <AnimatePresence>
                                                {selectMode && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.4 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.4 }}
                                                        transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                                                        className='absolute top-2 left-2 z-10'
                                                    >
                                                        {isSelected ? (
                                                            <motion.div
                                                                initial={{ scale: 0.6 }}
                                                                animate={{ scale: 1 }}
                                                                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                                                className='w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center'
                                                                style={{
                                                                    boxShadow: '0 0 0 2.5px rgba(59,130,246,0.40), inset 0 1px 0 rgba(255,255,255,0.25)',
                                                                }}
                                                            >
                                                                <svg width='10' height='8' viewBox='0 0 10 8' fill='none'>
                                                                    <path
                                                                        d='M1.5 4L3.5 6.5L8.5 1.5'
                                                                        stroke='white'
                                                                        strokeWidth='1.5'
                                                                        strokeLinecap='round'
                                                                        strokeLinejoin='round'
                                                                    />
                                                                </svg>
                                                            </motion.div>
                                                        ) : (
                                                            <div
                                                                className='w-5 h-5 rounded-full'
                                                                style={{
                                                                    background: isLightMode
                                                                        ? 'rgba(248,244,237,0.55)'
                                                                        : 'rgba(28,28,30,0.55)',
                                                                    backdropFilter: 'blur(8px)',
                                                                    WebkitBackdropFilter: 'blur(8px)',
                                                                    border: `1.5px solid ${isLightMode
                                                                        ? 'rgba(120,96,60,0.30)'
                                                                        : 'rgba(255,255,255,0.38)'}`,
                                                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
                                                                }}
                                                            />
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Countdown badge — hidden in select mode */}
                                            {timing && !selectMode && (
                                                <div className='absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm border border-border/50 rounded-md px-2 py-1'>
                                                    <p className='text-xs font-medium text-foreground'>{timing.text}</p>
                                                </div>
                                            )}

                                            {/* Three dots menu — hidden in select mode */}
                                            {!selectMode && (
                                                <div className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                                            <button className='p-1.5 rounded-md bg-background/80 backdrop-blur hover:bg-background transition-colors'>
                                                                <MoreVertical className='w-4 h-4 text-foreground' />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                            align='end'
                                                            onClick={(e) => e.preventDefault()}
                                                            className='border border-border/50 shadow-lg backdrop-blur-sm bg-background/95'
                                                        >
                                                            <DropdownMenuItem
                                                                onClick={() => handleRestore(project._id)}
                                                                className='cursor-pointer'
                                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isLightMode ? '#EFE7DD' : '#141414' }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                                                            >
                                                                <RotateCcw className='w-4 h-4 mr-2' />
                                                                Restore
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleEnterSelectMode(project._id)}
                                                                className='cursor-pointer'
                                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isLightMode ? '#EFE7DD' : '#141414' }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                                                            >
                                                                <CheckSquare className='w-4 h-4 mr-2' />
                                                                Select
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className='text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer'
                                                                onClick={() => handleDeleteClick(project._id)}
                                                            >
                                                                <Trash2 className='w-4 h-4 mr-2' />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            )}
                                        </div>

                                        {/* Name + date */}
                                        <div className='space-y-1'>
                                            <h3 className={cn(
                                                'font-medium text-foreground text-sm truncate',
                                                !selectMode && 'group-hover:text-primary transition-colors'
                                            )}>
                                                {project.name}
                                            </h3>
                                            <p className='text-xs text-muted-foreground'>
                                                {project.deleted_at
                                                    ? `Deleted ${formatDistanceToNow(new Date(project.deleted_at), { addSuffix: true })}`
                                                    : 'Deleted'}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Floating selection bar */}
            <AnimatePresence>
                {selectMode && (
                    <TrashSelectionBar
                        selectedCount={selectedIds.size}
                        totalCount={filteredProjects.length}
                        isLight={isLightMode}
                        onCancel={handleCancelSelect}
                        onSelectAll={handleSelectAll}
                        onDeleteSelected={() => setDeleteSelectedOpen(true)}
                    />
                )}
            </AnimatePresence>

            {/* Dialogs */}
            <DeleteConfirmationDialog
                open={isDeleteAllOpen}
                onOpenChange={setIsDeleteAllOpen}
                projectName='Trash'
                onConfirm={handleDeleteAll}
                isLoading={isDeleting}
                customTitle='Empty Trash?'
                customDescription='Permanently delete all designs in Trash. This cannot be undone.'
            />
            <DeleteConfirmationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                projectName={visibleProjects.find(p => p._id === deleteId)?.name || 'Project'}
                onConfirm={handleDeleteConfirm}
                isLoading={false}
                customTitle='Permanently Delete?'
                customDescription='This design will be erased forever and cannot be recovered.'
            />
            <DeleteConfirmationDialog
                open={deleteSelectedOpen}
                onOpenChange={setDeleteSelectedOpen}
                projectName={`${selectedIds.size} item${selectedIds.size !== 1 ? 's' : ''}`}
                onConfirm={handleDeleteSelected}
                isLoading={isDeletingSelected}
                customTitle={`Delete ${selectedIds.size} selected?`}
                customDescription={`Permanently delete ${selectedIds.size} project${selectedIds.size !== 1 ? 's' : ''}. This cannot be undone.`}
            />
        </div>
    )
}

export default TrashList