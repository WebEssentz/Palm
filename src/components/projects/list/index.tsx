"use client"
import { useProjectCreation } from '@/hooks/use-project'
import { useProjects } from './provider'
import { useAppSelector } from '@/redux/store'
import { Plus, Search, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { usePalmToast } from '@/hooks/use-palmtoast'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeleteConfirmationDialog } from '@/components/projects/modals/delete-confirmation-dialog'
import { RenameProjectModal } from '@/components/projects/modals/rename-modal'

function isColorDark(color: string | undefined): boolean {
    // Extract first hex color from the string (works for solid colors and gradients)
    const hex = (color?.match(/#[a-fA-F0-9]{6}/) || [])[0]
    if (!hex) return true // assume dark if unparseable

    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)

    // Perceived luminance (standard formula)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance < 0.35
}

const ProjectsList = ({ onProjectDelete }: { onProjectDelete?: () => void }) => {
    const { canCreate } = useProjectCreation()
    const projects = useProjects()
    const user = useAppSelector((state) => state.profile)
    const { theme, systemTheme } = useTheme()
    const { toast } = usePalmToast()
    const [searchQuery, setSearchQuery] = useState('')
    const [renameId, setRenameId] = useState<string | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isRenaming, setIsRenaming] = useState(false)
    const [optimisticallyDeletedIds, setOptimisticallyDeletedIds] = useState<Set<string>>(new Set())
    
    const renameProjectMutation = useMutation(api.projects.renameProject)
    const deleteProjectMutation = useMutation(api.projects.deleteProject)
    const restoreProjectMutation = useMutation(api.projects.restoreProject)
    
    const effectiveTheme = theme === 'system' ? systemTheme : theme
    const isLightMode = effectiveTheme === 'light'
    const filteredProjects = projects
        .filter((project) => !optimisticallyDeletedIds.has(project._id))
        .filter((project) =>
            project.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
        )

    const handleRenameStart = (projectId: string) => {
        setRenameId(projectId)
    }

    const handleRenameSave = async (newName: string) => {
        if (!renameId || !newName.trim()) return
        setIsRenaming(true)
        try {
            await renameProjectMutation({
                projectId: renameId as any,
                newName,
            })
            toast(`Project renamed to "${newName}"`, { type: 'success' })
        } catch (err) {
            console.error('Rename failed:', err)
        } finally {
            setIsRenaming(false)
            setRenameId(null)
        }
    }

    const handleUndoDelete = async (projectId: string) => {
        // Get the project to restore
        const project = projects.find(p => p._id === projectId)
        if (!project) return

        // Restore the project (reverse the delete)
        try {
            await restoreProjectMutation({ projectId: projectId as any })
            // Remove from optimistically deleted set to show it again
            setOptimisticallyDeletedIds(prev => {
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
        
        // 1. Get project name for toast
        const project = projects.find(p => p._id === deleteId)
        const projectName = project?.name || 'Project'

        // 2. Immediately close modal + remove from UI
        const idToDelete = deleteId
        setOptimisticallyDeletedIds(prev => new Set([...prev, idToDelete]))
        setDeleteDialogOpen(false)
        setDeleteId(null)
        setIsDeleting(true)
        
        // 3. Notify parent component of deletion (for optimistic UI updates like showing Trash)
        onProjectDelete?.()

        // 4. Show success toast with undo action
        toast(`${projectName} moved to Trash`, {
            type: 'success',
            action: { label: 'Undo', onClick: () => handleUndoDelete(idToDelete) }
        })

        try {
            await deleteProjectMutation({ projectId: idToDelete as any })
        } catch (err) {
            // Revert optimistic update on failure
            setOptimisticallyDeletedIds(prev => {
                const next = new Set(prev)
                next.delete(idToDelete)
                return next
            })
            console.error('Delete failed:', err)
        } finally {
            setIsDeleting(false)
        }
    }

    if (!canCreate) {
        return (
            <div className='text-center py-12'>
                <p className='text-lg'>Please sign in to view your projects</p>
            </div>
        )
    }
    
    return (
        <div className='space-y-8'>
            <div className='flex items-start justify-between gap-4 flex-wrap'>
                <div>
                    <h1 className='text-3xl font-semibold text-foreground'>
                        Your Projects
                    </h1>
                    <p className='text-muted-foreground mt-2'>
                        Manage your design projects and continue where you left off
                    </p>
                </div>
                <div
                    className='relative w-full max-w-xs h-10 rounded-full overflow-hidden bg-[rgba(250,246,238,0.88)] dark:bg-[rgba(255,255,255,0.07)] border border-[rgba(120,96,60,0.10)] dark:border-[rgba(255,255,255,0.12)]'
                    style={{
                        backdropFilter: 'url(#palm-glass-light) blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: [
                            '0 0 0 0.5px rgba(100,76,40,0.08)',
                            '0 2px 4px rgba(80,60,30,0.06)',
                            '0 8px 20px rgba(80,60,30,0.09)',
                            'inset 0 1px 0 rgba(255,255,255,0.90)',
                            'inset 0 -1px 0 rgba(100,76,40,0.04)',
                        ].join(', '),
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

            {projects.length === 0 ? (
                <div className='text-center py-20'>
                    <div className='w-16 h-16 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center'>
                        <Plus className='w-8 h-8 text-muted-foreground' />
                    </div>
                    <h3 className='text-lg font-medium text-foreground mb-2'>
                        No projects yet
                    </h3>
                    <p className='text-sm text-muted-foreground mb-6'>
                        Create your first project to get started
                    </p>
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className='text-center py-20'>
                    <h3 className='text-lg font-medium text-foreground mb-2'>
                        No matching projects
                    </h3>
                    <p className='text-sm text-muted-foreground'>
                        Try a different search term.
                    </p>
                </div>
            ) : (
                <>
                    <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'>
                        {filteredProjects.map((project) => (
                            <div
                                key={project._id}
                                className='group cursor-pointer relative'
                            >
                                <Link
                                    href={`/dashboard/${user?.name}/canvas?project=${project._id}`}
                                    className='block'
                                >
                                    <div className='space-y-3'>
                                        <div className='aspect-[4/3] rounded-lg overflow-hidden bg-muted relative'>
                                            <div
                                                className='w-full h-full flex items-center justify-center group-hover:opacity-90 transition-opacity'
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

                                            {/* Three dots menu - appears on hover */}
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
                                                            onClick={() => handleRenameStart(project._id)}
                                                            className='cursor-pointer'
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = isLightMode ? '#EFE7DD' : '#141414'
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'transparent'
                                                            }}
                                                        >
                                                            <Pencil className='w-4 h-4 mr-2' />
                                                            Rename
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
                                        </div>
                                        <div className='space-y-1'>
                                            <h3 className='font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors'>
                                                {project.name}
                                            </h3>
                                            <p className='text-xs text-muted-foreground'>
                                                {formatDistanceToNow(new Date(project.lastModified), {
                                                    addSuffix: true,
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                    <DeleteConfirmationDialog
                        open={deleteDialogOpen}
                        onOpenChange={setDeleteDialogOpen}
                        projectName={projects.find(p => p._id === deleteId)?.name || 'Project'}
                        onConfirm={handleDeleteConfirm}
                        isLoading={isDeleting}
                    />
                    <RenameProjectModal
                        open={renameId !== null}
                        onOpenChange={(open) => {
                            if (!open) setRenameId(null)
                        }}
                        projectName={projects.find(p => p._id === renameId)?.name || ''}
                        onConfirm={handleRenameSave}
                        isLoading={isRenaming}
                    />
                </>
            )}
        </div>
    )
}

export default ProjectsList
