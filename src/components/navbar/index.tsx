'use client'

import React from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Id } from '../../../convex/_generated/dataModel'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { MoreHorizontal, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { combinedSlug, cn } from '@/lib/utils'
import { LogoIcon } from '@/components/logo'
import { motion, AnimatePresence } from 'framer-motion'
import { useViewportTracking } from '@/hooks/use-viewport-tracking'
import OutOfViewBanner from '@/components/canvas/out-of-view-banner'
import AutoSave from '@/components/canvas/autosave'

/**
 * Shared hover pill for the project name + workspace name.
 * The negative left margin cancels the horizontal padding so the text
 * stays aligned with where it sat before the pill existed.
 */
const pillBase =
    'rounded-full px-2.5 py-1 -ml-2.5 transition-colors duration-150 cursor-pointer'
const pillHover =
    'hover:bg-neutral-200/80 dark:hover:bg-white/10'

const Navbar = () => {
    const params = useSearchParams()
    const me = useQuery(api.user.getCurrentUser)
    const userSlug = combinedSlug(me?.name ?? '', me?._id)
    const workspaceName = `${me?.name || 'User'}'s workspace`
    const projectId = params.get('project')
    const pathname = usePathname()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => setMounted(true), [])

    const hasCanvas = pathname.includes('canvas')
    const hasStyleGuide = pathname.includes('style-guide')
    const isHome = !hasCanvas && !hasStyleGuide

    const { isOutOfView, resetView, zoomToFit } = useViewportTracking()

    const isValidProjectId = projectId && projectId !== 'null' && projectId !== 'undefined'

    const project = useQuery(
        api.projects.getProject,
        isValidProjectId ? { projectId: projectId as Id<'projects'> } : 'skip'
    )

    const renameProject = useMutation(api.projects.renameProject)

    const [isEditing, setIsEditing] = React.useState(false)
    const [isClosing, setIsClosing] = React.useState(false)
    const [draftName, setDraftName] = React.useState('')
    const [optimisticTab, setOptimisticTab] = React.useState<string | null>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const originalNameRef = React.useRef('')
    const closingRef = React.useRef(false)

    React.useEffect(() => {
        setOptimisticTab(null)
    }, [pathname])

    const startEditing = () => {
        const name = project?.name ?? ''
        originalNameRef.current = name
        setDraftName(name)
        setIsEditing(true)
        setTimeout(() => {
            // inputRef.current?.focus()
            // inputRef.current?.select()   // <- this was selecting the whole name on click
            const el = inputRef.current
            if (!el) return
            el.focus()
            // caret goes to the end instead of selecting everything
            el.setSelectionRange(el.value.length, el.value.length)
        }, 0)
    }

    // plays the underline exit animation, THEN unmounts the editor
    const closeEditor = () => {
        if (closingRef.current) return
        closingRef.current = true
        setIsClosing(true)
        setTimeout(() => {
            setIsEditing(false)
            setIsClosing(false)
            closingRef.current = false
        }, 220)
    }

    const commitRename = async () => {
        if (closingRef.current) return
        const trimmed = draftName.trim()
        closeEditor()
        if (trimmed && trimmed !== originalNameRef.current && isValidProjectId) {
            await renameProject({
                projectId: projectId as Id<'projects'>,
                newName: trimmed,
            }).catch(() => { })
        }
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
            closeEditor()
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
        <>
            {/* Scrim: fades the dot grid out behind the navbar so its content stays readable.
                Uses the theme background token, so it works in light AND dark automatically. */}
            <div
                aria-hidden
                className='pointer-events-none fixed inset-x-0 top-0 z-40 h-28 bg-gradient-to-b from-background via-background/80 to-transparent'
            />

            <div className='fixed top-4 left-5 right-5 z-50 flex items-start justify-between pointer-events-none'>
                {/* Left: Palm Logo + Project Name & Workspace Info */}
                <div className='pointer-events-auto flex items-start gap-5'>
                    {/* Palm Logo icon — nudged up and slightly right */}
                    <Link
                        href={`/projects`}
                        title="Go to projects"
                        className='-ml-1 -mt-0.5 hover:opacity-80 transition-opacity flex items-center flex-shrink-0 cursor-pointer'
                    >
                        <LogoIcon className="w-5 h-5" />
                    </Link>

                    {/* Project name + MoreHorizontal (top row) & Workspace link (bottom row) */}
                    {/* gap-2 -> gap-0 because the pills now carry their own vertical padding */}
                    {/* <div className='-ml-1.5 -mt-1 flex flex-col items-start gap-2 select-none'> */}
                    <div className='-ml-1.5 -mt-1.5 flex flex-col items-start gap-0 select-none'>
                        {/* Top row: Project name + MoreHorizontal */}
                        <div className='flex items-center gap-2.5'>
                            {isEditing ? (
                                /*
                                 * Sizer trick: an invisible span holds the exact text width and the
                                 * input sits on top of it in the same grid cell. The width now matches
                                 * the real rendered text (the old `ch` width didn't, which caused the glitch).
                                 * Same padding as the button, so nothing shifts when you enter edit mode.
                                 */
                                <div className={cn('relative inline-grid items-center', pillBase)}>
                                    <span
                                        aria-hidden
                                        className='invisible whitespace-pre col-start-1 row-start-1 text-[13px] font-semibold min-w-[60px]'
                                    >
                                        {/* trailing space gives the caret room at the end */}
                                        {draftName + ' '}
                                    </span>
                                    <input
                                        ref={inputRef}
                                        value={draftName}
                                        onChange={e => setDraftName(e.target.value)}
                                        onBlur={handleBlur}
                                        onKeyDown={handleKeyDown}
                                        autoFocus
                                        spellCheck={false}
                                        className='col-start-1 row-start-1 w-full min-w-0 text-[13px] font-semibold bg-transparent outline-none text-foreground'
                                        // old inline width (removed, replaced by the sizer span above):
                                        // style={{ minWidth: 60, width: `${Math.max(draftName.length, 4)}ch` }}
                                    />
                                    {/* Animated underline: draws in from the left on entering edit mode,
                                        then tracks the text width exactly as you type */}
                                    <motion.span
                                        aria-hidden
                                        initial={{ scaleX: 0, opacity: 0 }}
                                        animate={isClosing ? { scaleX: 0, opacity: 0 } : { scaleX: 1, opacity: 1 }}
                                        transition={{ duration: isClosing ? 0.2 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                                        style={{ originX: isClosing ? 1 : 0 }}
                                        className='absolute left-2.5 right-2.5 bottom-[3px] h-px bg-foreground/40 pointer-events-none'
                                    />
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={startEditing}
                                    title="Click to rename project"
                                    // className='text-[13px] font-semibold text-foreground hover:text-foreground/80 dark:hover:text-neutral-200 transition-colors cursor-pointer text-left py-0.5'
                                    className={cn(
                                        'text-[13px] font-semibold text-foreground text-left',
                                        'hover:text-neutral-900 dark:hover:text-white',
                                        pillBase,
                                        pillHover
                                    )}
                                >
                                    {project?.name ?? 'Untitled'}
                                </button>
                            )}

                            {/* MoreHorizontal icon (dropdown disabled for now as requested) */}
                            <button
                                type="button"
                                title="More options"
                                className={cn(
                                    'flex items-center justify-center rounded-md p-1 text-neutral-400 transition-colors cursor-pointer',
                                    'hover:text-neutral-900 dark:hover:text-white',
                                    'hover:bg-neutral-200/80 dark:hover:bg-white/10'
                                )}
                            >
                                <MoreHorizontal className='w-4 h-4' />
                            </button>
                        </div>

                        {/* Bottom row: Workspace name button linking to /projects */}
                        <Link
                            href={`/projects`}
                            title="View workspace projects"
                            // className='text-xs font-normal text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors cursor-pointer block text-left'
                            className={cn(
                                'text-xs font-normal text-neutral-400 dark:text-neutral-500 block text-left',
                                'hover:text-neutral-900 dark:hover:text-white',
                                pillBase,
                                pillHover
                            )}
                        >
                            {workspaceName}
                        </Link>
                    </div>
                </div>

                {/* Top Center: Tabs Pill + Out-Of-View Banner underneath */}
                <div className='absolute left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-2'>
                    <nav
                        aria-label="Workspace view tabs"
                        className='h-9 p-1 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-sm flex items-center gap-0.5 relative z-20'
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

                    {/* Banner appears directly UNDER the tabs */}
                    <AnimatePresence>
                        {isCanvas && isOutOfView && (
                            <motion.div
                                key="out-of-view-banner"
                                initial={{ opacity: 0, y: -10, scale: 0.94 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.94 }}
                                transition={{
                                    type: 'spring',
                                    damping: 26,
                                    stiffness: 340,
                                    mass: 0.8,
                                }}
                                className="z-10"
                            >
                                <OutOfViewBanner
                                    onResetView={resetView}
                                    onZoomToFit={zoomToFit}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
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
        </>
    )
}

export default Navbar