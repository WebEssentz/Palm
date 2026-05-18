'use client'

import { useAppSelector } from '@/redux/store'
import { Plus, RotateCcw, Trash2, Search, MoreVertical } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { useEffect, useState } from 'react'
import { DeleteConfirmationDialog } from './modals/delete-confirmation-dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

function thumbnailToSrc(thumbnail: string | undefined): string | null {
    if (!thumbnail) return null
    if (thumbnail.startsWith('linear-gradient')) {
        const colors = thumbnail.match(/#[a-fA-F0-9]{6}/g) || ['#888888', '#444444']
        const [c1, c2] = colors.length >= 2 ? [colors[0], colors[1]] : [colors[0] || '#888', '#444']
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
            <defs>
                <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${c1}"/>
                    <stop offset="100%" stop-color="${c2}"/>
                </linearGradient>
            </defs>
            <rect width="20" height="20" rx="4" fill="url(#g)"/>
        </svg>`
        return `data:image/svg+xml,${encodeURIComponent(svg)}`
    }
    return null
}

function calculateRemainingTime(deletedAtMs: number): { text: string; isExpired: boolean } {
    const now = Date.now()
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
    const expiresAt = deletedAtMs + THREE_DAYS_MS
    const remaining = expiresAt - now

    if (remaining <= 0) {
        return { text: '0h left', isExpired: true }
    }

    const days = Math.floor(remaining / (24 * 60 * 60 * 1000))
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))

    if (days > 0) {
        return { text: `${days}d left`, isExpired: false }
    } else if (hours > 0) {
        return { text: `${hours}h left`, isExpired: false }
    } else {
        return { text: `${minutes}m left`, isExpired: false }
    }
}

const TrashList = () => {
    const user = useAppSelector((state) => state.profile)
    const { theme, systemTheme } = useTheme()
    
    const effectiveTheme = theme === 'system' ? systemTheme : theme
    const isLightMode = effectiveTheme === 'light'
    
    const deletedProjects = useQuery(
        api.projects.getDeletedProjects,
        user?.id ? { userId: user.id as Id<'users'> } : 'skip'
    )

    const deleteAllMutation = useMutation(api.projects.deleteAllDeletedProjects)
    const restoreProjectMutation = useMutation(api.projects.restoreProject)
    const deleteProjectMutation = useMutation(api.projects.deleteProject)

    const [visibleProjects, setVisibleProjects] = useState<any[]>([])
    const [timings, setTimings] = useState<Record<string, { text: string; isExpired: boolean }>>({})
    const [fadingOut, setFadingOut] = useState<Set<string>>(new Set())
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [optimisticallyRemovedIds, setOptimisticallyRemovedIds] = useState<Set<string>>(new Set())

    // Initialize visible projects when deletedProjects loads
    useEffect(() => {
        if (deletedProjects) {
            setVisibleProjects(deletedProjects)
            
            // Calculate initial timings
            const newTimings: Record<string, any> = {}
            deletedProjects.forEach((project: any) => {
                if (project.deleted_at) {
                    newTimings[project._id] = calculateRemainingTime(project.deleted_at)
                }
            })
            setTimings(newTimings)
        }
    }, [deletedProjects])

    // Set up interval to update countdown timers and remove expired projects
    useEffect(() => {
        if (visibleProjects.length === 0) return

        const interval = setInterval(() => {
            setVisibleProjects((prev) => {
                const updated = prev.filter((project: any) => {
                    if (!project.deleted_at) return true
                    const timing = calculateRemainingTime(project.deleted_at)
                    
                    if (timing.isExpired && !fadingOut.has(project._id)) {
                        // Start fade out
                        setFadingOut((prev) => new Set([...prev, project._id]))
                        
                        // Remove after animation completes (500ms)
                        setTimeout(() => {
                            setVisibleProjects((p) => p.filter((pr: any) => pr._id !== project._id))
                            setFadingOut((prev) => {
                                const next = new Set(prev)
                                next.delete(project._id)
                                return next
                            })
                            // Also clean up timings
                            setTimings((prev) => {
                                const next = { ...prev }
                                delete next[project._id]
                                return next
                            })
                        }, 500)
                        
                        return false
                    }
                    
                    return true
                })

                // Update timings for remaining projects
                const newTimings: Record<string, any> = {}
                updated.forEach((project: any) => {
                    if (project.deleted_at) {
                        newTimings[project._id] = calculateRemainingTime(project.deleted_at)
                    }
                })
                setTimings(newTimings)

                return updated
            })
        }, 1000) // Update every second

        return () => clearInterval(interval)
    }, [visibleProjects.length, fadingOut])

    const handleDeleteAll = async () => {
        setIsDeleting(true)
        try {
            await deleteAllMutation()
            setVisibleProjects([])
            setTimings({})
            setIsDeleteAllOpen(false)
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
        
        // 1. Immediately remove from UI (optimistic update)
        const idToDelete = deleteId
        setOptimisticallyRemovedIds(prev => new Set([...prev, idToDelete]))
        setDeleteDialogOpen(false)
        setDeleteId(null)

        try {
            await deleteProjectMutation({ projectId: idToDelete as any })
        } catch (err) {
            // Revert optimistic update on failure
            setOptimisticallyRemovedIds(prev => {
                const next = new Set(prev)
                next.delete(idToDelete)
                return next
            })
            console.error('Delete failed:', err)
        }
    }

    const handleRestore = async (projectId: string) => {
        // 1. Immediately remove from trash UI (optimistic update with fade out)
        setFadingOut(prev => new Set([...prev, projectId]))
        
        // 2. Remove from visible projects after animation
        setTimeout(() => {
            setVisibleProjects(prev => prev.filter(p => p._id !== projectId))
            setFadingOut(prev => {
                const next = new Set(prev)
                next.delete(projectId)
                return next
            })
            // Clean up timings
            setTimings(prev => {
                const next = { ...prev }
                delete next[projectId]
                return next
            })
        }, 500)

        try {
            await restoreProjectMutation({ projectId: projectId as any })
        } catch (err) {
            // Revert: add back to visible projects
            const project = deletedProjects?.find(p => p._id === projectId)
            if (project && project.deleted_at) {
                setVisibleProjects(prev => [...prev, project])
                setTimings(prev => ({
                    ...prev,
                    [projectId]: calculateRemainingTime(project.deleted_at!)
                }))
            }
            setFadingOut(prev => {
                const next = new Set(prev)
                next.delete(projectId)
                return next
            })
            console.error('Restore failed:', err)
        }
    }

    if (deletedProjects === undefined || deletedProjects === null) {
        return (
            <div className='w-full max-w-7xl pt-10'>
                <div className='animate-pulse'>Loading...</div>
            </div>
        )
    }

    if (deletedProjects.length === 0) {
        return (
            <div className='w-full max-w-7xl pt-10'>
                <div className='text-center py-20'>
                    <div className='w-16 h-16 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center'>
                        <Plus className='w-8 h-8 text-muted-foreground' />
                    </div>
                    <h3 className='text-lg font-medium text-foreground mb-2'>
                        Trash is empty
                    </h3>
                    <p className='text-sm text-muted-foreground'>
                        Deleted projects appear here for 3 days before permanent removal
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className='w-full max-w-7xl mb-5'>
            <div className='space-y-8'>
                <div className='flex items-start justify-between gap-4 flex-wrap'>
                    <div>
                        <h1 className='text-3xl font-semibold text-foreground'>
                            Trash
                        </h1>
                        <p className='text-muted-foreground mt-2'>
                            Items in Trash are permanently deleted after 3 days.
                        </p>
                    </div>
                    <div className='flex items-center gap-3 w-full max-w-md'>
                        <div
                            className='relative flex-1 h-10 rounded-full overflow-hidden bg-[rgba(250,246,238,0.88)] dark:bg-[rgba(255,255,255,0.07)] border border-[rgba(120,96,60,0.10)] dark:border-[rgba(255,255,255,0.12)]'
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
                                placeholder='Search trash by name'
                                className='w-full h-full pl-10 pr-3 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground'
                            />
                        </div>
                        {visibleProjects.length > 0 && (
                            <button
                                onClick={() => setIsDeleteAllOpen(true)}
                                disabled={isDeleting}
                                className='px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 bg-[rgba(250,246,238,0.88)] dark:bg-[rgba(255,255,255,0.07)] border border-[rgba(120,96,60,0.10)] dark:border-[rgba(255,255,255,0.12)] text-foreground hover:text-foreground'
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
                                <Trash2 className='w-4 h-4' />
                                Empty Trash
                            </button>
                        )}
                    </div>
                </div>

                <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'>
                    {visibleProjects
                        .filter((project: any) => !optimisticallyRemovedIds.has(project._id))
                        .filter((project: any) =>
                            project.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
                        )
                        .map((project: any) => {
                        const timing = timings[project._id]
                        const isFading = fadingOut.has(project._id)
                        
                        return (
                            <div
                                key={project._id}
                                className={`group cursor-pointer relative transition-all duration-500 ${isFading ? 'opacity-0 scale-95' : 'opacity-75 hover:opacity-100'}`}
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
                                        
                                        {/* Countdown badge */}
                                        {timing && (
                                            <div className='absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm border border-border/50 rounded-md px-2 py-1'>
                                                <p className='text-xs font-medium text-foreground'>
                                                    {timing.text}
                                                </p>
                                            </div>
                                        )}

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
                                                        onClick={() => handleRestore(project._id)}
                                                        className='cursor-pointer'
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = isLightMode ? '#EFE7DD' : '#141414'
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'transparent'
                                                        }}
                                                    >
                                                        <RotateCcw className='w-4 h-4 mr-2' />
                                                        Restore
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
                                            {project.deleted_at ? `Deleted ${formatDistanceToNow(new Date(project.deleted_at), { addSuffix: true })}` : 'Deleted'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <DeleteConfirmationDialog
                open={isDeleteAllOpen}
                onOpenChange={setIsDeleteAllOpen}
                projectName="Trash"
                onConfirm={handleDeleteAll}
                isLoading={isDeleting}
                customTitle="Empty Trash?"
                customDescription="Permanently delete all designs in Trash. This cannot be undone."
            />
            <DeleteConfirmationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                projectName={visibleProjects.find(p => p._id === deleteId)?.name || 'Project'}
                onConfirm={handleDeleteConfirm}
                isLoading={false}
                customTitle="Permanently Delete?"
                customDescription="This design will be erased forever and cannot be recovered."
            />
        </div>
    )
}

export default TrashList
