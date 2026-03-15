'use client'

import React from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Id } from '../../../convex/_generated/dataModel'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { CircleQuestionMark, Hash, LayoutTemplate, User } from 'lucide-react'
import { Button } from '../ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { useAppSelector } from '@/redux/store'
import CreateProject from '../buttons/project'
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

    // Validate projectId is not null, undefined, or the string "null"
    const isValidProjectId = projectId && projectId !== 'null' && projectId !== 'undefined'

    const project = useQuery(
        api.projects.getProject,
        isValidProjectId ? { projectId: projectId as Id<'projects'> } : 'skip'
    )

    const creditBalance = useQuery(
        api.subscription.getCreditsBalance,
        me?.id ? { userId: me.id as Id<"users"> } : 'skip'
    )

    const tabs: TabProps[] = [
        {
            label: "Canvas",
            href: `/dashboard/${me.name}/canvas?project=${projectId}`,
            icon: <Hash className='w-4 h-4' />
        },
        {
            label: "Style Guide",
            href: `/dashboard/${me.name}/style-guide?project=${projectId}`,
            icon: <LayoutTemplate className='w-4 h-4' />
        }
    ]


    const pathname = usePathname()
    const hasCanvas = pathname.includes('canvas')
    const hasStyleGuide = pathname.includes('style-guide')


    return (
        <div className='grid grid-cols-2 lg:grid-cols-3 p-6 fixed top-0 left-0 right-0 z-50'>
            <div className='flex items-center gap-4'>
                <Link
                    href={`/dashboard/${me.name}`}
                    className='w-8 h-8 rounded-full border-2 border-foreground bg-background flex items-center justify-center'
                >
                    <div className='w-4 h-4 rounded-full bg-foreground'></div>
                </Link>
                {!hasCanvas ||
                    (!hasStyleGuide && (
                        <div className='lg:inline-block hidden rounded-full text-muted-foreground border border-border backdrop-blur-xl bg-muted/50 px-4 py-2 text-sm'>
                            Project / {project?.name}
                        </div>
                    ))
                }
            </div>

            <div className='lg:flex hidden items-center justify-center gap-2'>
                <div className='flex items-center gap-2 backdrop-blur-xl bg-muted/50 px-4 py-2 rounded-full border border-border'>
                    {tabs.map((t) => (
                        <Link
                            key={t.href}
                            href={t.href}
                            className={['group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition',
                                `${pathname}?project=${projectId}` === t.href
                                    ? 'bg-background text-foreground border border-border shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50 border border-transparent',
                            ].join(' ')}
                        >
                            <span className={`${pathname}?project=${projectId}` === t.href ? 'opacity-100' : 'opacity-70 group-hover:opacity-90'}>
                                {t.icon}
                            </span>
                            <span>{t.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            <div className='flex items-center justify-end gap-4'>
                <div className='flex items-center gap-1.5 bg-muted/50 border border-border backdrop-blur-xl rounded-full px-3 py-1.5'>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Trunk */}
                        <path d="M8 14V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        {/* Left leaf */}
                        <path d="M8 8C8 8 4 7 3 4C5.5 3.5 8 5 8 8Z" fill="currentColor" opacity="0.8" />
                        {/* Right leaf */}
                        <path d="M8 8C8 8 12 7 13 4C10.5 3.5 8 5 8 8Z" fill="currentColor" opacity="0.8" />
                        {/* Top leaf */}
                        <path d="M8 8C8 8 7 4 9 2C10.5 3.5 10 6 8 8Z" fill="currentColor" opacity="0.9" />
                        {/* Small left leaf */}
                        <path d="M8 9C8 9 5 9.5 4 7.5C6 6.5 8 8 8 9Z" fill="currentColor" opacity="0.6" />
                        {/* Small right leaf */}
                        <path d="M8 9C8 9 11 9.5 12 7.5C10 6.5 8 8 8 9Z" fill="currentColor" opacity="0.6" />
                    </svg>
                    <span className='text-sm font-medium tabular-nums'>
                        {creditBalance ?? 0}
                    </span>
                </div>
                <ThemeToggle />
                <Button
                    variant="secondary"
                    className='rounded-full h-12 w-12 flex items-center justify-center backdrop-blur-xl bg-muted/50 border border-border hover:bg-muted'
                >
                    <CircleQuestionMark className='size-5 text-foreground' />
                </Button>
                <Avatar className='size-12 ml-2'>
                    <AvatarImage src={me.image || ''} />
                    <AvatarFallback>
                        <User className='size-5' />
                    </AvatarFallback>
                </Avatar>
                {hasCanvas && <AutoSave />}
                {!hasCanvas && !hasStyleGuide && <CreateProject />}
            </div>
        </div>
    )
}

export default Navbar