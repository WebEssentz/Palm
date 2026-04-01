'use client'

import React from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Id } from '../../../convex/_generated/dataModel'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Hash, LayoutTemplate, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { useAppSelector } from '@/redux/store'
import { ThemeToggle } from '../theme/toggle'
import AutoSave from '../canvas/autosave'

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

    const hasCanvas = pathname.includes('canvas')
    const hasStyleGuide = pathname.includes('style-guide')
    const isHome = !hasCanvas && !hasStyleGuide

    const isValidProjectId = projectId && projectId !== 'null' && projectId !== 'undefined'

    const project = useQuery(
        api.projects.getProject,
        isValidProjectId ? { projectId: projectId as Id<'projects'> } : 'skip'
    )

    // On dashboard home, the page renders its own topbar — hide the navbar entirely
    if (isHome) return null

    const tabs: TabProps[] = [
        {
            label: 'Canvas',
            href: `/dashboard/${me.name}/canvas?project=${projectId}`,
            icon: <Hash className='w-4 h-4' />,
        },
        {
            label: 'Style Guide',
            href: `/dashboard/${me.name}/style-guide?project=${projectId}`,
            icon: <LayoutTemplate className='w-4 h-4' />,
        },
    ]

    return (
        <div className='grid grid-cols-2 lg:grid-cols-3 px-6 py-4 fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/40'>
            {/* Left: logo + breadcrumb */}
            <div className='flex items-center gap-3'>
                <Link
                    href={`/dashboard/${me.name}`}
                    className='w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0'
                >
                    <div className='w-3.5 h-3.5 rounded-full bg-primary-foreground' />
                </Link>
                <span className='hidden lg:block text-sm text-muted-foreground'>
                    {project?.name ?? '—'}
                </span>
            </div>

            {/* Center: tabs */}
            <div className='lg:flex hidden items-center justify-center'>
                <div className='flex items-center gap-1 bg-muted/60 px-2 py-1.5 rounded-full border border-border'>
                    {tabs.map((t) => (
                        <Link
                            key={t.href}
                            href={t.href}
                            className={[
                                'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-all',
                                `${pathname}?project=${projectId}` === t.href
                                    ? 'bg-background text-foreground border border-border shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            ].join(' ')}
                        >
                            {t.icon}
                            {t.label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Right: theme + autosave + avatar */}
            <div className='flex items-center justify-end gap-3'>
                {hasCanvas && <AutoSave />}
                <ThemeToggle />
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