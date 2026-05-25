'use client'

import React from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { Id } from '../../../convex/_generated/dataModel'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Menu, Pencil, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { useAppSelector } from '@/redux/store'

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

    const renameProject = useMutation(api.projects.renameProject)

    const [isEditing, setIsEditing] = React.useState(false)
    const [draftName, setDraftName] = React.useState('')
    const [showPen, setShowPen] = React.useState(false)
    const [showTooltip, setShowTooltip] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const originalNameRef = React.useRef('')

    const startEditing = () => {
        const name = project?.name ?? ''
        originalNameRef.current = name
        setDraftName(name)
        setIsEditing(true)
        setShowPen(false)
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

    if (isHome) return null

    const penBtnStyle: React.CSSProperties = isLight ? {
        background: 'rgba(240,235,225,0.80)',
        border: '1px solid rgba(120,96,60,0.10)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.80)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
    } : {
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
    }

    const menuBtnStyle: React.CSSProperties = isLight ? {
        background: 'rgba(10,10,10,0.08)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(10,10,10,0.10)',
        boxShadow: '0 0 0 0.5px rgba(10,10,10,0.05), inset 0 1px 0 rgba(255,255,255,0.80)',
    } : {
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 0 0 0.5px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.05)',
    }

    return (
        <div
            className='flex items-center justify-between pl-4 pr-4 py-2 fixed top-0 left-0 right-0 z-50'
        >
            {/* Left: hamburger + project name */}
            <div className='flex items-center gap-3'>
                <Link
                    href={`/dashboard/${me.name}`}
                    className='flex items-center justify-center px-3 py-2 rounded-full text-muted-foreground hover:text-foreground transition-colors flex-shrink-0'
                    style={menuBtnStyle}
                >
                    <Menu className='w-4 h-4' />
                </Link>

                {/* Project name + pen */}
                <div
                    className='flex items-center gap-1.5'
                    onMouseEnter={() => !isEditing && setShowPen(true)}
                    onMouseLeave={() => { setShowPen(false); setShowTooltip(false) }}
                >
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            value={draftName}
                            onChange={e => setDraftName(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            className='text-sm font-medium bg-transparent outline-none'
                            style={{
                                borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)'}`,
                                color: 'inherit',
                                minWidth: 40,
                                width: `${Math.max(draftName.length, 4)}ch`,
                            }}
                        />
                    ) : (
                        <span className='text-sm font-medium text-foreground'>
                            {project?.name ?? '—'}
                        </span>
                    )}

                    {/* Pen button */}
                    {!isEditing && showPen && (
                        <div className='relative'>
                            <button
                                onClick={startEditing}
                                onMouseEnter={() => setShowTooltip(true)}
                                onMouseLeave={() => setShowTooltip(false)}
                                className='w-6 h-6 flex items-center justify-center rounded-lg cursor-pointer hover:opacity-70 transition-opacity'
                                style={penBtnStyle}
                            >
                                <Pencil className='w-3 h-3 text-foreground/50' />
                            </button>

                            {showTooltip && (
                                <div
                                    className='absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap pointer-events-none'
                                    style={{
                                        ...penBtnStyle,
                                        color: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)',
                                    }}
                                >
                                    Rename
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: avatar */}
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