'use client'

import React from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { Id } from '../../../convex/_generated/dataModel'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Menu, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { useAppSelector } from '@/redux/store'


type TabProps = {
    label: string
    href: string
    icon?: React.ReactNode
}

const Navbar = () => {
    const params = useSearchParams()
    const me = useAppSelector((state) => state.profile)
    const projectId = params.get('project')
    const pathname = usePathname()
    const { theme, systemTheme } = useTheme()
    const isLight = (theme === 'system' ? systemTheme : theme) === 'light'

    const hasCanvas = pathname.includes('canvas')
    const hasStyleGuide = pathname.includes('style-guide')
    const isHome = !hasCanvas && !hasStyleGuide

    const isValidProjectId = projectId && projectId !== 'null' && projectId !== 'undefined'

    const project = useQuery(
        api.projects.getProject,
        isValidProjectId ? { projectId: projectId as Id<'projects'> } : 'skip'
    )

    if (isHome) return null

    // const tabs: TabProps[] = [
    //     {
    //         label: 'Canvas',
    //         href: `/dashboard/${me.name}/canvas?project=${projectId}`,
    //         icon: <Hash className='w-4 h-4' />,
    //     },
    //     {
    //         label: 'Style Guide',
    //         href: `/dashboard/${me.name}/style-guide?project=${projectId}`,
    //         icon: <LayoutTemplate className='w-4 h-4' />,
    //     },
    // ]

    return (
        <div className='flex items-center justify-between pl-7 pr-4 py-2 fixed top-0 left-0 right-0 z-50'>
            {/* Left: hamburger + project name */}
            <div className='flex items-center gap-3'>
                <Link
                    href={`/dashboard/${me.name}`}
                    className='flex items-center justify-center px-4 py-2 rounded-full text-muted-foreground hover:text-foreground transition-colors flex-shrink-0'
                    style={{
                        background: isLight
                            ? 'rgba(10, 10, 10, 0.08)'
                            : 'rgba(255, 255, 255, 0.06)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: isLight
                            ? '1px solid rgba(10, 10, 10, 0.10)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: isLight
                            ? '0 0 0 0.5px rgba(10, 10, 10, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.80)'
                            : '0 0 0 0.5px rgba(255, 255, 255, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                    }}
                >
                    <Menu className='w-4 h-4' />
                </Link>
                <span className='text-sm font-medium text-foreground'>
                    {project?.name ?? '—'}
                </span>
            </div>

            {/* Right: theme + avatar */}
            <div className='flex items-center gap-3'>
                <Avatar className='size-8'>
                    <AvatarImage src={me.image || ''} />
                    <AvatarFallback>
                        <User className='size-4' />
                    </AvatarFallback>
                </Avatar>
            </div>
        </div>
    )
}

export default Navbar