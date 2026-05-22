'use client'

import { motion, AnimatePresence } from 'framer-motion'
import React, { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Project {
    _id: string
    name: string
    thumbnail?: string
    lastModified: number
}

interface MobileDrawerProps {
    isOpen: boolean
    onClose: () => void
    projects: Project[]
    trashedProjects?: Project[]
    hasDeleted: boolean
    userName: string
    isLightMode: boolean
    thumbnailToSrc: (thumbnail: string | undefined) => string | null
    isColorDark: (color: string | undefined) => boolean
}

export function MobileDrawer({
    isOpen,
    onClose,
    projects,
    trashedProjects = [],
    hasDeleted,
    userName,
    isLightMode,
    thumbnailToSrc,
    isColorDark,
}: MobileDrawerProps) {
    const [activeTab, setActiveTab] = useState<'projects' | 'trash'>('projects')
    const [search, setSearch] = useState('')

    // 4. innerGlass — no blur, sits on top of the already-glass drawer
    const innerGlass: React.CSSProperties = isLightMode
        ? {
              background: 'rgba(255,255,255,0.35)',
              border: '0.5px solid rgba(120,96,60,0.12)',
          }
        : {
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.10)',
          }

    const activeList = activeTab === 'projects' ? projects : trashedProjects
    const filtered = activeList.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase().trim())
    )

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <svg
                        style={{ position: 'fixed', width: 0, height: 0, overflow: 'hidden', top: 0, left: 0 }}
                        aria-hidden
                    >
                        <defs>
                            <filter id='drawer-liquid' x='-20%' y='-20%' width='140%' height='140%' colorInterpolationFilters='sRGB'>
                                <feTurbulence type='fractalNoise' baseFrequency='0.65 0.42' numOctaves='3' seed='12' result='noise'>
                                    <animate attributeName='baseFrequency' values='0.65 0.42;0.68 0.44;0.65 0.42' dur='8s' repeatCount='indefinite' />
                                </feTurbulence>
                                <feGaussianBlur in='noise' stdDeviation='1.6' result='blurNoise' />
                                <feDisplacementMap in='SourceGraphic' in2='blurNoise' scale='10' xChannelSelector='R' yChannelSelector='G' result='displaced' />
                                <feColorMatrix in='displaced' type='saturate' values='1.4' result='saturated' />
                                <feComposite in='saturated' in2='SourceGraphic' operator='atop' />
                            </filter>
                        </defs>
                    </svg>

                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className='fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden'
                    />

                    {/* 6. overflow-hidden added */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className='fixed bottom-0 left-0 right-0 z-50 md:hidden rounded-t-2xl flex flex-col overflow-hidden'
                        style={{
                            height: '80vh',
                            background: isLightMode
                                ? 'rgba(248,244,237,0.82)'
                                : 'rgba(18,18,20,0.72)',
                            backdropFilter: 'url(#drawer-liquid) blur(24px) saturate(1.6)',
                            WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
                            borderTop: isLightMode
                                ? '0.5px solid rgba(120,96,60,0.12)'
                                : '0.5px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        {/* 2. Specular highlight */}
                        <div
                            className='pointer-events-none absolute inset-x-0 top-0 h-[1px]'
                            style={{
                                background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.9) 50%, transparent 95%)',
                            }}
                        />

                        {/* Drag handle */}
                        <div className='flex justify-center pt-3 pb-2 flex-shrink-0'>
                            <div
                                className='w-10 h-1 rounded-full'
                                style={{
                                    background: isLightMode
                                        ? 'rgba(0,0,0,0.12)'
                                        : 'rgba(255,255,255,0.15)',
                                }}
                            />
                        </div>

                        {/* Logo — left side */}
                        <div className='flex items-center gap-2 px-6 pt-6 pb-6 flex-shrink-0 border-b border-border/20'>
                            <Link
                                href={`/dashboard/${userName}`}
                                onClick={onClose}
                                className='w-6 h-6 rounded-lg bg-primary flex items-center justify-center flex-shrink-0'
                            >
                                <div className='w-3.5 h-3.5 rounded-full bg-primary-foreground' />
                            </Link>
                            <span className='font-semibold text-sm text-foreground tracking-tight'>
                                Palm
                            </span>
                        </div>

                        {/* Tabs — 4. innerGlass */}
                        <div className='px-4 flex-shrink-0'>
                            <div
                                className='flex gap-1.5 p-1 rounded-full'
                                style={innerGlass}
                            >
                                <button
                                    onClick={() => { setActiveTab('projects'); setSearch('') }}
                                    className='flex-1 py-1.5 rounded-full text-xs font-medium transition-all'
                                    style={{
                                        background:
                                            activeTab === 'projects'
                                                ? isLightMode
                                                    ? 'rgba(255,255,255,0.85)'
                                                    : 'rgba(255,255,255,0.13)'
                                                : 'transparent',
                                        color:
                                            activeTab === 'projects'
                                                ? 'var(--foreground)'
                                                : 'var(--muted-foreground)',
                                        boxShadow:
                                            activeTab === 'projects' && !isLightMode
                                                ? 'inset 0 0 0 0.5px rgba(255,255,255,0.1)'
                                                : 'none',
                                    }}
                                >
                                    Projects
                                </button>
                                <button
                                    onClick={() => { setActiveTab('trash'); setSearch('') }}
                                    className='flex-1 py-1.5 rounded-full text-xs font-medium transition-all'
                                    style={{
                                        background:
                                            activeTab === 'trash'
                                                ? isLightMode
                                                    ? 'rgba(255,255,255,0.85)'
                                                    : 'rgba(255,255,255,0.13)'
                                                : 'transparent',
                                        color:
                                            activeTab === 'trash'
                                                ? 'var(--foreground)'
                                                : 'var(--muted-foreground)',
                                        boxShadow:
                                            activeTab === 'trash' && !isLightMode
                                                ? 'inset 0 0 0 0.5px rgba(255,255,255,0.1)'
                                                : 'none',
                                    }}
                                >
                                    Trash
                                </button>
                            </div>
                        </div>

                        {/* Search — 4. innerGlass */}
                        <div className='px-4 mt-5 flex-shrink-0'>
                            <div
                                className='relative h-9 rounded-full overflow-hidden'
                                style={innerGlass}
                            >
                                <Search className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground' />
                                <input
                                    type='text'
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={
                                        activeTab === 'projects'
                                            ? 'Search projects…'
                                            : 'Search trash…'
                                    }
                                    className='h-full w-full bg-transparent pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none'
                                />
                            </div>
                        </div>

                        {/* Scrollable list */}
                        <div className='flex-1 overflow-y-auto px-4 mt-6 pb-8'>
                            {filtered.length === 0 ? (
                                <p className='text-sm text-muted-foreground text-center py-10'>
                                    {search
                                        ? 'No matching projects'
                                        : activeTab === 'trash'
                                        ? 'Trash is empty'
                                        : 'No projects yet'}
                                </p>
                            ) : (
                                <div className='space-y-0.5'>
                                    {filtered.map((p) => {
                                        const src = thumbnailToSrc(p.thumbnail)
                                        const dark = isColorDark(p.thumbnail)
                                        const href =
                                            activeTab === 'projects'
                                                ? `/dashboard/${userName}/canvas?project=${p._id}`
                                                : `/dashboard/${userName}/trash`

                                        return (
                                            <Link
                                                key={p._id}
                                                href={href}
                                                onClick={onClose}
                                                className='flex items-center gap-3 px-2 py-2 rounded-lg transition-colors'
                                                // 5. rgba hover — respects glass surface
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor =
                                                        isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent'
                                                }}
                                            >
                                                {src ? (
                                                    <img
                                                        src={src}
                                                        className='w-8 h-8 rounded-md flex-shrink-0'
                                                        alt=''
                                                    />
                                                ) : (
                                                    <div
                                                        className='w-8 h-8 rounded-md flex-shrink-0'
                                                        style={{
                                                            background:
                                                                !isLightMode && dark
                                                                    ? '#ffffff'
                                                                    : p.thumbnail || '#888888',
                                                        }}
                                                    />
                                                )}
                                                <div className='min-w-0 flex-1'>
                                                    <p className='text-sm text-foreground truncate'>
                                                        {p.name}
                                                    </p>
                                                    <p className='text-xs text-muted-foreground'>
                                                        {formatDistanceToNow(
                                                            new Date(p.lastModified),
                                                            { addSuffix: true }
                                                        )}
                                                    </p>
                                                </div>
                                            </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}