'use client'

import { useAppSelector } from '@/redux/store'
import { Plus, RotateCcw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'

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

const TrashList = () => {
    const user = useAppSelector((state) => state.profile)
    const { theme, systemTheme } = useTheme()
    
    const effectiveTheme = theme === 'system' ? systemTheme : theme
    const isLightMode = effectiveTheme === 'light'
    
    const deletedProjects = useQuery(
        api.projects.getDeletedProjects,
        user?.id ? { userId: user.id as Id<'users'> } : 'skip'
    )

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
        <div className='w-full max-w-7xl pt-10'>
            <div className='space-y-8'>
                <div>
                    <h1 className='text-3xl font-semibold text-foreground'>
                        Trash
                    </h1>
                    <p className='text-muted-foreground mt-2'>
                        Projects deleted within the last 3 days. They will be permanently removed after that.
                    </p>
                </div>

                <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'>
                    {deletedProjects.map((project: any) => (
                        <div
                            key={project._id}
                            className='group cursor-pointer relative opacity-75 hover:opacity-100 transition-opacity'
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
                                </div>
                                <div className='space-y-1'>
                                    <h3 className='font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors'>
                                        {project.name}
                                    </h3>
                                    <p className='text-xs text-muted-foreground'>
                                        Deleted {formatDistanceToNow(new Date(project.deleted_at), {
                                            addSuffix: true,
                                        })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default TrashList
