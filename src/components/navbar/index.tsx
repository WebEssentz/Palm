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
                <span className='text-sm text-muted-foreground'>
                    TODO: CREDITS
                </span>
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
                {!hasCanvas && !hasStyleGuide && <CreateProject />}
            </div>
        </div>
    )
}

export default Navbar