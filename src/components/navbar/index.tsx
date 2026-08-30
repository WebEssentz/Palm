'use client'

import React from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { Id } from '../../../convex/_generated/dataModel'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { ChevronDown, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { combinedSlug, cn } from '@/lib/utils'
import { Logo } from '@/components/logo'
import { motion } from 'framer-motion'
import AutoSave from '../canvas/autosave'

const Navbar = () => {
    const params = useSearchParams()
    const me = useQuery(api.user.getCurrentUser)
    const userSlug = combinedSlug(me?.name ?? '', me?._id)
    const projectId = params.get('project')
    const pathname = usePathname()
    const { theme, systemTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)
    const isLight = (theme === 'system' ? systemTheme : theme) === 'light'

    React.useEffect(() => setMounted(true), [])

    const hasCanvas = pathname.includes('canvas')
    const hasStyleGuide = pathname.includes('style-guide')
    const isHome = !hasCanvas && !hasStyleGuide

    const isValidProjectId = projectId && projectId !== 'null' && projectId !== 'undefined'

    const project = useQuery(
        api.projects.getProject,
        isValidProjectId ? { projectId: projectId as Id<'projects'> } : 'skip'
    )

    const renameProject = useMutation(api.projects.renameProject)

    const [isEditing, setIsEditing] = React.useState(false)
    const [draftName, setDraftName] = React.useState('')
    const [optimisticTab, setOptimisticTab] = React.useState<string | null>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const originalNameRef = React.useRef('')

    React.useEffect(() => {
        setOptimisticTab(null)
    }, [pathname])

    const startEditing = () => {
        const name = project?.name ?? ''
        originalNameRef.current = name
        setDraftName(name)
        setIsEditing(true)
        setTimeout(() => {
            inputRef.current?.focus()
            inputRef.current?.select()
        }, 0)
    }

    const commitRename = async () => {
        const trimmed = draftName.trim()
        if (trimmed && trimmed !== originalNameRef.current && isValidProjectId) {
            await renameProject({
                projectId: projectId as Id<'projects'>,
                newName: trimmed,
            }).catch(() => { })
        }
        setIsEditing(false)
    }

    const handleBlur = () => {
        commitRename()
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            commitRename()
        } else if (e.key === 'Escape') {
            setDraftName(originalNameRef.current)
            setIsEditing(false)
        }
    }

    if (isHome || !mounted) return null

    const basePath = pathname.split('/').slice(0, 3).join('/') || `/dashboard/${userSlug}`
    const canvasHref = `${basePath}/canvas${projectId ? `?project=${projectId}` : ''}`
    const stylesHref = `${basePath}/style-guide${projectId ? `?project=${projectId}` : ''}`
    const isCanvas = pathname.includes('/canvas')
    const isStyles = pathname.includes('/style-guide')
    const currentTabId = isStyles ? 'styles' : isCanvas ? 'canvas' : null
    const activeTabId = optimisticTab ?? currentTabId

    const tabs = [
        { id: 'canvas', label: 'Canvas', href: canvasHref, active: activeTabId === 'canvas' },
        { id: 'styles', label: 'Styles', href: stylesHref, active: activeTabId === 'styles' },
    ]

    const handleTabClick = (e: React.MouseEvent, tab: typeof tabs[number]) => {
        e.preventDefault()
        setOptimisticTab(tab.id)
        window.history.pushState(null, '', tab.href)
        window.dispatchEvent(new CustomEvent('workspace-tab-change', { detail: { tab: tab.id } }))
    }

    return (
        <div className='fixed top-3 left-3 right-3 z-50 flex items-center justify-between pointer-events-none'>
            {/* Left: Floating pill containing Palm Logo + Slash + Project Name */}
            <div className='pointer-events-auto h-9 px-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-sm flex items-center gap-2.5'>
                <Link
                    href={`/dashboard/${userSlug}`}
                    className='hover:opacity-85 transition-opacity flex items-center'
                >
                    <Logo />
                </Link>

                <span className='text-muted-foreground/40 text-xs select-none'>/</span>

                {/* Project name + caret */}
                <div className='flex items-center gap-1.5'>
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            value={draftName}
                            onChange={e => setDraftName(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            className='text-xs font-medium bg-transparent outline-none text-foreground'
                            style={{
                                borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)'}`,
                                minWidth: 40,
                                width: `${Math.max(draftName.length, 4)}ch`,
                            }}
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={startEditing}
                            title="Click to rename"
                            className='flex items-center gap-1 text-xs font-medium text-foreground hover:text-foreground/80 transition-colors cursor-pointer'
                        >
                            <span>{project?.name ?? 'Untitled'}</span>
                            <ChevronDown className='w-3 h-3 text-muted-foreground' />
                        </button>
                    )}
                </div>
            </div>

            {/* Top Center: Tabs Pill (Canvas / Styles) with animated active indicator */}
            <div className='absolute left-1/2 -translate-x-1/2 pointer-events-auto'>
                <nav
                    aria-label="Workspace view tabs"
                    className='h-9 p-1 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-sm flex items-center gap-0.5 relative'
                >
                    {tabs.map((tab) => (
                        <Link
                            key={tab.id}
                            href={tab.href}
                            prefetch={true}
                            onClick={(e) => handleTabClick(e, tab)}
                            className={cn(
                                'relative px-3.5 py-1 text-xs font-medium rounded-lg transition-colors select-none z-10 flex items-center justify-center cursor-pointer',
                                tab.active
                                    ? 'text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {tab.active && (
                                <motion.div
                                    layoutId='navbar-active-tab'
                                    transition={{
                                        type: 'spring',
                                        stiffness: 500,
                                        damping: 35,
                                    }}
                                    className='absolute inset-0 rounded-lg bg-neutral-100 dark:bg-neutral-800 shadow-xs -z-10'
                                />
                            )}
                            {tab.label}
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Right: Avatar (standalone, not inside pill) */}
            <div className='pointer-events-auto flex items-center gap-3'>
                {hasCanvas && <AutoSave />}
                <Avatar className='size-7'>
                    <AvatarImage src={me?.image || ''} />
                    <AvatarFallback>
                        <User className='size-3.5' />
                    </AvatarFallback>
                </Avatar>
            </div>
        </div>
    )
}

export default Navbar