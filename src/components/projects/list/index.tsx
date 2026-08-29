"use client"
import { useProjectCreation } from '@/hooks/use-project'
import { useProjects } from './provider'
import { Plus, Search, MoreVertical, Pencil, Trash2, X, CheckSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { usePalmToast } from '@/hooks/use-palmtoast'
import { combinedSlug, cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeleteConfirmationDialog } from '@/components/projects/modals/delete-confirmation-dialog'
import { RenameProjectModal } from '@/components/projects/modals/rename-modal'

function isColorDark(color: string | undefined): boolean {
    const hex = (color?.match(/#[a-fA-F0-9]{6}/) || [])[0]
    if (!hex) return true
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance < 0.35
}

const ProjectsList = ({ onProjectDelete }: { onProjectDelete?: () => void }) => {
    const { canCreate } = useProjectCreation()
    const projects = useProjects()
    const me = useQuery(api.user.getCurrentUser)
    const userSlug = combinedSlug(me?.name ?? '', me?._id)
    const { theme, systemTheme } = useTheme()
    const { toast } = usePalmToast()

    const effectiveTheme = theme === 'system' ? systemTheme : theme
    const isLightMode = effectiveTheme === 'light'

    // ── Core state ────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('')
    const [renameId, setRenameId] = useState<string | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isRenaming, setIsRenaming] = useState(false)
    const [optimisticallyDeletedIds, setOptimisticallyDeletedIds] = useState<Set<string>>(new Set())

    // ── Select mode state ─────────────────────────────────────
    const [selectMode, setSelectMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false)
    const [isDeletingSelected, setIsDeletingSelected] = useState(false)

    // ── Long press refs ───────────────────────────────────────
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const longPressTriggered = useRef(false)

    // ── Mutations ─────────────────────────────────────────────
    const renameProjectMutation  = useMutation(api.projects.renameProject)
    const deleteProjectMutation  = useMutation(api.projects.deleteProject)
    const restoreProjectMutation = useMutation(api.projects.restoreProject)

    // ── Computed ──────────────────────────────────────────────
    const filteredProjects = projects
        .filter((p) => !optimisticallyDeletedIds.has(p._id))
        .filter((p) => p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))

    // ── Long press handlers ───────────────────────────────────
    const startLongPress = (projectId: string) => {
        longPressTriggered.current = false
        longPressTimer.current = setTimeout(() => {
            longPressTriggered.current = true
            navigator.vibrate?.(50)
            setSelectMode(true)
            setSelectedIds(new Set([projectId]))
        }, 500)
    }

    const cancelLongPress = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current)
            longPressTimer.current = null
        }
    }

    // ── Select mode handlers ──────────────────────────────────
    const toggleSelection = (projectId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(projectId)) next.delete(projectId)
            else next.add(projectId)
            return next
        })
    }

    const handleSelectAll = () => {
        const ids = filteredProjects.map((p) => p._id)
        if (selectedIds.size === ids.length) setSelectedIds(new Set())
        else setSelectedIds(new Set(ids))
    }

    const handleCancelSelect = () => {
        setSelectMode(false)
        setSelectedIds(new Set())
    }

    const handleBulkMoveToTrash = async () => {
        const idsToDelete = Array.from(selectedIds)
        setOptimisticallyDeletedIds((prev) => new Set([...prev, ...idsToDelete]))
        setDeleteSelectedOpen(false)
        setSelectMode(false)
        setSelectedIds(new Set())
        setIsDeletingSelected(true)
        onProjectDelete?.()

        toast(
            `${idsToDelete.length} project${idsToDelete.length !== 1 ? 's' : ''} moved to Trash`,
            { type: 'success' }
        )

        try {
            await Promise.all(
                idsToDelete.map((id) => deleteProjectMutation({ projectId: id as any }))
            )
        } catch (err) {
            setOptimisticallyDeletedIds((prev) => {
                const next = new Set(prev)
                idsToDelete.forEach((id) => next.delete(id))
                return next
            })
            console.error('Bulk move to trash failed:', err)
        } finally {
            setIsDeletingSelected(false)
        }
    }

    // ── Single item handlers ──────────────────────────────────
    const handleRenameStart = (projectId: string) => setRenameId(projectId)

    const handleRenameSave = async (newName: string) => {
        if (!renameId || !newName.trim()) return
        setIsRenaming(true)
        try {
            await renameProjectMutation({ projectId: renameId as any, newName })
            toast(`Project renamed to "${newName}"`, { type: 'success' })
        } catch (err) {
            console.error('Rename failed:', err)
        } finally {
            setIsRenaming(false)
            setRenameId(null)
        }
    }

    const handleUndoDelete = async (projectId: string) => {
        const project = projects.find((p) => p._id === projectId)
        if (!project) return
        try {
            await restoreProjectMutation({ projectId: projectId as any })
            setOptimisticallyDeletedIds((prev) => {
                const next = new Set(prev)
                next.delete(projectId)
                return next
            })
        } catch (err) {
            console.error('Undo delete failed:', err)
        }
    }

    const handleDeleteClick = (projectId: string) => {
        setDeleteId(projectId)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteId) return
        const project = projects.find((p) => p._id === deleteId)
        const projectName = project?.name || 'Project'
        const idToDelete = deleteId

        setOptimisticallyDeletedIds((prev) => new Set([...prev, idToDelete]))
        setDeleteDialogOpen(false)
        setDeleteId(null)
        setIsDeleting(true)
        onProjectDelete?.()

        toast(`${projectName} moved to Trash`, {
            type: 'success',
            action: { label: 'Undo', onClick: () => handleUndoDelete(idToDelete) },
        })

        try {
            await deleteProjectMutation({ projectId: idToDelete as any })
        } catch (err) {
            setOptimisticallyDeletedIds((prev) => {
                const next = new Set(prev)
                next.delete(idToDelete)
                return next
            })
            console.error('Delete failed:', err)
        } finally {
            setIsDeleting(false)
        }
    }

    // ── Early return ──────────────────────────────────────────
    if (!canCreate) {
        return (
            <div className='text-center py-12'>
                <p className='text-lg'>Please sign in to view your projects</p>
            </div>
        )
    }

    // ── Render ────────────────────────────────────────────────
    return (
        <div className='space-y-8'>

            {/* Header */}
            <div className='flex items-start justify-between gap-4 flex-wrap'>
                <div>
                    <h1 className='text-3xl font-semibold text-foreground'>Your Projects</h1>
                    <p className='text-muted-foreground mt-2'>
                        Manage your design projects and continue where you left off
                    </p>
                </div>
                <div
                    className='relative w-full max-w-xs h-10 rounded-full overflow-hidden'
                    style={{
                        background: isLightMode ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${isLightMode ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.09)'}`,
                    }}
                >
                    <Search className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                    <input
                        type='text'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder='Search projects by name'
                        className='h-full w-full rounded-full bg-transparent pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    />
                </div>
            </div>

            {/* Empty states */}
            {projects.length === 0 ? (
                <div className='text-center py-20'>
                    <div className='w-16 h-16 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center'>
                        <Plus className='w-8 h-8 text-muted-foreground' />
                    </div>
                    <h3 className='text-lg font-medium text-foreground mb-2'>No projects yet</h3>
                    <p className='text-sm text-muted-foreground mb-6'>
                        Create your first project to get started
                    </p>
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className='text-center py-20'>
                    <h3 className='text-lg font-medium text-foreground mb-2'>No matching projects</h3>
                    <p className='text-sm text-muted-foreground'>Try a different search term.</p>
                </div>
            ) : (
                <>
                    {/* Grid */}
                    <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'>
                        {filteredProjects.map((project) => {
                            const isSelected = selectedIds.has(project._id)

                            return (
                                <motion.div
                                    key={project._id}
                                    animate={{ rotate: selectMode && isSelected ? 2 : 0 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                    className={cn(
                                        'relative cursor-pointer',
                                        selectMode && isSelected  && 'opacity-100',
                                        selectMode && !isSelected && 'opacity-45',
                                        !selectMode && 'group',
                                    )}
                                    // Touch events for long press
                                    onTouchStart={() => startLongPress(project._id)}
                                    onTouchEnd={cancelLongPress}
                                    onTouchMove={cancelLongPress}
                                    onContextMenu={(e) => e.preventDefault()}
                                    // Click: toggle selection in select mode
                                    onClick={selectMode ? () => toggleSelection(project._id) : undefined}
                                >
                                    {/* In select mode: plain div; otherwise: Link */}
                                    {selectMode ? (
                                        <div className='space-y-3'>
                                            <CardThumbnail
                                                project={project}
                                                isLightMode={isLightMode}
                                                selectMode
                                                isSelected={isSelected}
                                            />
                                            <CardMeta project={project} />
                                        </div>
                                    ) : (
                                        <Link
                                            href={`/dashboard/${userSlug}/canvas?project=${project._id}`}
                                            className='block space-y-3'
                                            onClick={(e) => {
                                                // Guard: if long press just fired, don't navigate
                                                if (longPressTriggered.current) {
                                                    e.preventDefault()
                                                    longPressTriggered.current = false
                                                }
                                            }}
                                        >
                                            <CardThumbnail
                                                project={project}
                                                isLightMode={isLightMode}
                                                selectMode={false}
                                                isSelected={false}
                                                onRename={() => handleRenameStart(project._id)}
                                                onSelect={() => { setSelectMode(true); setSelectedIds(new Set([project._id])) }}
                                                onDelete={() => handleDeleteClick(project._id)}
                                            />
                                            <CardMeta project={project} />
                                        </Link>
                                    )}
                                </motion.div>
                            )
                        })}
                    </div>

                    {/* Dialogs */}
                    <DeleteConfirmationDialog
                        open={deleteDialogOpen}
                        onOpenChange={setDeleteDialogOpen}
                        projectName={projects.find((p) => p._id === deleteId)?.name || 'Project'}
                        onConfirm={handleDeleteConfirm}
                        isLoading={isDeleting}
                    />
                    <RenameProjectModal
                        open={renameId !== null}
                        onOpenChange={(open) => { if (!open) setRenameId(null) }}
                        projectName={projects.find((p) => p._id === renameId)?.name || ''}
                        onConfirm={handleRenameSave}
                        isLoading={isRenaming}
                    />
                    <DeleteConfirmationDialog
                        open={deleteSelectedOpen}
                        onOpenChange={setDeleteSelectedOpen}
                        projectName={`${selectedIds.size} item${selectedIds.size !== 1 ? 's' : ''}`}
                        onConfirm={handleBulkMoveToTrash}
                        isLoading={isDeletingSelected}
                        customTitle={`Move ${selectedIds.size} project${selectedIds.size !== 1 ? 's' : ''} to Trash?`}
                        customDescription={`${selectedIds.size} project${selectedIds.size !== 1 ? 's' : ''} will be moved to Trash. You can restore them within 3 days.`}
                    />
                </>
            )}

            {/* Floating selection bar */}
            <AnimatePresence>
                {selectMode && (
                    <motion.div
                        initial={{ y: 80, opacity: 0, scale: 0.96 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 80, opacity: 0, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className='fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2.5 rounded-2xl shadow-2xl'
                        style={{
                            background: isLightMode
                                ? 'rgba(255,255,255,0.96)'
                                : 'rgba(18,18,18,0.96)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            border: `1px solid ${isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)'}`,
                        }}
                    >
                        {/* Cancel */}
                        <button
                            onClick={handleCancelSelect}
                            className='flex items-center justify-center w-8 h-8 rounded-xl transition-colors hover:bg-muted'
                        >
                            <X className='w-4 h-4 text-muted-foreground' />
                        </button>

                        <div
                            className='w-px h-5 mx-0.5'
                            style={{
                                background: isLightMode ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.12)',
                            }}
                        />

                        {/* Count */}
                        <span className='text-sm font-medium text-foreground px-1 min-w-[6ch] text-center'>
                            {selectedIds.size === 0
                                ? 'None'
                                : `${selectedIds.size} selected`}
                        </span>

                        <div
                            className='w-px h-5 mx-0.5'
                            style={{
                                background: isLightMode ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.12)',
                            }}
                        />

                        {/* Select all / Deselect all */}
                        <button
                            onClick={handleSelectAll}
                            className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-foreground transition-colors hover:bg-muted whitespace-nowrap'
                        >
                            <CheckSquare className='w-3.5 h-3.5' />
                            {selectedIds.size === filteredProjects.length ? 'Deselect all' : 'Select all'}
                        </button>

                        <div
                            className='w-px h-5 mx-0.5'
                            style={{
                                background: isLightMode ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.12)',
                            }}
                        />

                        {/* Move to Trash */}
                        <button
                            onClick={() => selectedIds.size > 0 && setDeleteSelectedOpen(true)}
                            disabled={selectedIds.size === 0}
                            className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap',
                                selectedIds.size > 0
                                    ? 'text-red-500 hover:bg-red-500/10 cursor-pointer'
                                    : 'text-muted-foreground opacity-40 cursor-not-allowed'
                            )}
                        >
                            <Trash2 className='w-3.5 h-3.5' />
                            {selectedIds.size > 0 ? `Move to Trash (${selectedIds.size})` : 'Move to Trash'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ── Sub-components ────────────────────────────────────────────

interface CardThumbnailProps {
    project: any
    isLightMode: boolean
    selectMode: boolean
    isSelected: boolean
    onRename?: () => void
    onDelete?: () => void
    onSelect?: () => void
}

function CardThumbnail({ project, isLightMode, selectMode, isSelected, onRename, onDelete, onSelect }: CardThumbnailProps) {
    return (
        <div className='aspect-[4/3] rounded-lg overflow-hidden bg-muted relative'>
            <div
                className={cn(
                    'w-full h-full flex items-center justify-center transition-opacity',
                    !selectMode && 'group-hover:opacity-90'
                )}
                style={{
                    background: project.thumbnail
                        ? (!isLightMode && isColorDark(project.thumbnail) ? '#ffffff' : project.thumbnail)
                        : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                }}
            >
                {!project.thumbnail && <Plus className='w-8 h-8 text-gray-400' />}
            </div>

            {/* Selection circle */}
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
                                style={{ boxShadow: '0 0 0 2.5px rgba(59,130,246,0.40), inset 0 1px 0 rgba(255,255,255,0.25)' }}
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
                                    background: isLightMode ? 'rgba(248,244,237,0.55)' : 'rgba(28,28,30,0.55)',
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
                                    border: `1.5px solid ${isLightMode ? 'rgba(120,96,60,0.30)' : 'rgba(255,255,255,0.38)'}`,
                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
                                }}
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Three dots menu — hidden in select mode */}
            {!selectMode && onRename && onDelete && (
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
                                onClick={onRename}
                                className='cursor-pointer'
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isLightMode ? '#EFE7DD' : '#141414' }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                            >
                                <Pencil className='w-4 h-4 mr-2' />
                                Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={onSelect}
                                className='cursor-pointer'
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isLightMode ? '#EFE7DD' : '#141414' }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                            >
                                <CheckSquare className='w-4 h-4 mr-2' />
                                Select
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className='text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer'
                                onClick={onDelete}
                            >
                                <Trash2 className='w-4 h-4 mr-2' />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
        </div>
    )
}

function CardMeta({ project }: { project: any }) {
    return (
        <div className='space-y-1'>
            <h3 className='font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors'>
                {project.name}
            </h3>
            <p className='text-xs text-muted-foreground'>
                {formatDistanceToNow(new Date(project.lastModified), { addSuffix: true })}
            </p>
        </div>
    )
}

export default ProjectsList