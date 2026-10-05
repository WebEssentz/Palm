'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Trash2, PanelLeft, Plus, Pin, ChevronDown } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/redux/store'
import { toggleSidebar, setSidebarOpen } from '@/redux/slice/ui'
import { GlassTooltip } from '@/components/ui/glass-tooltip'
import { useProjects } from '@/components/projects/list/provider'

export function thumbnailToSrc(thumbnail: string | undefined): string | null {
    if (!thumbnail) return null
    if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://') || thumbnail.startsWith('data:image/')) {
        return thumbnail
    }
    return null
}

interface SidebarProps {
    userSlug: string
    isLight: boolean
    text: string
    muted: string
    border: string
    view: 'home' | 'projects' | 'trash'
    hasDeleted: boolean
    onNewProject: () => void
}

export default function Sidebar({
    userSlug,
    isLight,
    text,
    muted,
    border,
    view,
    hasDeleted,
    onNewProject,
}: SidebarProps) {
    const sideOpen = useAppSelector(s => s.ui.sidebarOpen)
    const collapsed = !sideOpen
    const dispatch = useAppDispatch()
    const router = useRouter()
    const [pinnedOpen, setPinnedOpen] = useState(true)

    const allProjects = useProjects()
    const pinnedProjects = allProjects.filter(p => !!p.isPinned)

    // Sleek Anthropic-style rail: 52px collapsed, 260px expanded
    const sidebarWidth = sideOpen ? 260 : 52

    return (
        <motion.aside
            animate={{ width: sidebarWidth }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
                flexShrink: 0,
                height: '100vh',
                borderRight: `1px solid ${border}`,
                background: isLight ? '#fafafa' : '#0e0e0e',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 20,
                overflow: 'hidden',
                position: 'relative',
                boxSizing: 'border-box',
                padding: '0 8px',
            }}
        >
            {/* ── Top Header / Toggle ── */}
            <div
                style={{
                    height: 52,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    flexShrink: 0,
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: collapsed ? 0 : '0 4px 0 6px',
                }}
            >
                {collapsed ? (
                    <GlassTooltip content="Expand sidebar" side="right" disabled={!collapsed}>
                        <button
                            onClick={() => dispatch(toggleSidebar())}
                            style={{
                                width: 36,
                                height: 36,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: text,
                                borderRadius: 8,
                                padding: 0,
                                transition: 'background 0.12s ease',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent'
                            }}
                        >
                            <PanelLeft style={{ width: 18, height: 18 }} />
                        </button>
                    </GlassTooltip>
                ) : (
                    <>
                        <Link
                            href={`/dashboard/${userSlug}`}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                textDecoration: 'none',
                                minWidth: 0,
                                paddingLeft: 4,
                            }}
                        >
                            <div
                                style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 5,
                                    background: text,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: isLight ? '#fff' : '#0a0a0a' }} />
                            </div>
                            <span style={{ fontSize: 13.5, fontWeight: 650, color: text, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                                Palm
                            </span>
                        </Link>

                        <GlassTooltip content="Collapse sidebar" side="right" disabled={collapsed}>
                            <button
                                onClick={() => dispatch(toggleSidebar())}
                                style={{
                                    width: 32,
                                    height: 32,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: muted,
                                    borderRadius: 7,
                                    padding: 0,
                                    transition: 'all 0.12s ease',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.color = text
                                    e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)'
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.color = muted
                                    e.currentTarget.style.background = 'transparent'
                                }}
                            >
                                <PanelLeft style={{ width: 16, height: 16 }} />
                            </button>
                        </GlassTooltip>
                    </>
                )}
            </div>

            {/* ── New Project Button ── */}
            <div style={{ padding: '4px 0 6px', flexShrink: 0, width: '100%', boxSizing: 'border-box' }}>
                <GlassTooltip content="New project" side="right" disabled={!collapsed}>
                    <button
                        onClick={onNewProject}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            height: 36,
                            borderRadius: 8,
                            border: 'none',
                            cursor: 'pointer',
                            background: text,
                            color: isLight ? '#ffffff' : '#0a0a0a',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            boxSizing: 'border-box',
                            padding: 0,
                            transition: 'opacity 0.12s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                    >
                        {/* 36px centered icon container matching rail width */}
                        <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Plus style={{ width: 17, height: 17, strokeWidth: 2.25 }} />
                        </div>
                        <span
                            style={{
                                marginLeft: 4,
                                fontSize: 13,
                                fontWeight: 550,
                                whiteSpace: 'nowrap',
                                opacity: collapsed ? 0 : 1,
                                transition: 'opacity 0.15s ease',
                            }}
                        >
                            New project
                        </span>
                    </button>
                </GlassTooltip>
            </div>

            {/* ── Pinned Section (label same as folder then number: "Pinned" then number) ── */}
            {pinnedProjects.length > 0 && (
                <div style={{ padding: '4px 0 0', flexShrink: 0, width: '100%', boxSizing: 'border-box' }}>
                    <GlassTooltip content={`Pinned (${pinnedProjects.length})`} side="right" disabled={!collapsed}>
                        <div
                            onClick={() => {
                                if (collapsed) {
                                    dispatch(setSidebarOpen(true))
                                } else {
                                    setPinnedOpen(!pinnedOpen)
                                }
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: collapsed ? 'center' : 'space-between',
                                width: '100%',
                                height: 36,
                                padding: collapsed ? 0 : '0 8px 0 0',
                                borderRadius: 8,
                                cursor: 'pointer',
                                userSelect: 'none',
                                boxSizing: 'border-box',
                                transition: 'background 0.12s ease',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                                {collapsed ? (
                                    <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Pin style={{ width: 16, height: 16, color: muted }} />
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 8 }}>
                                        <Pin style={{ width: 15, height: 15, color: muted, flexShrink: 0 }} />
                                        <span style={{ fontSize: 13, fontWeight: 550, color: text, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                                            Pinned
                                        </span>
                                    </div>
                                )}
                            </div>

                            {!collapsed && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 500,
                                            padding: '1px 6px',
                                            borderRadius: 10,
                                            background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                                            color: muted,
                                        }}
                                    >
                                        {pinnedProjects.length}
                                    </span>
                                    <ChevronDown
                                        style={{
                                            width: 14,
                                            height: 14,
                                            color: muted,
                                            transform: pinnedOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                                            transition: 'transform 0.18s ease',
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </GlassTooltip>

                    {/* Pinned Projects List */}
                    {!collapsed && pinnedOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 12, marginTop: 2 }}>
                            {pinnedProjects.map(p => (
                                <Link
                                    key={p._id}
                                    href={`/dashboard/${userSlug}/canvas?project=${p._id}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        height: 30,
                                        padding: '0 8px',
                                        borderRadius: 6,
                                        textDecoration: 'none',
                                        color: isLight ? '#444444' : '#bbbbbb',
                                        fontSize: 12.5,
                                        fontWeight: 450,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        transition: 'background 0.12s, color 0.12s',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'
                                        e.currentTarget.style.color = text
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'transparent'
                                        e.currentTarget.style.color = isLight ? '#444444' : '#bbbbbb'
                                    }}
                                >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {p.name}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Nav Items (Trash only if deleted items exist) ── */}
            {hasDeleted && (
                <div style={{ padding: '4px 0 0', flexShrink: 0, width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ marginBottom: 3 }}>
                        <GlassTooltip content="Trash" side="right" disabled={!collapsed}>
                            <button
                                onClick={() => router.push(`/dashboard/${userSlug}/trash`)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    width: '100%',
                                    height: 36,
                                    borderRadius: 8,
                                    border: 'none',
                                    background: view === 'trash'
                                        ? (isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)')
                                        : 'transparent',
                                    color: view === 'trash' ? text : isLight ? '#333333' : '#cccccc',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                    boxSizing: 'border-box',
                                    padding: 0,
                                    transition: 'background 0.12s, color 0.12s',
                                }}
                                onMouseEnter={e => {
                                    if (view !== 'trash') {
                                        e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'
                                        e.currentTarget.style.color = text
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (view !== 'trash') {
                                        e.currentTarget.style.background = 'transparent'
                                        e.currentTarget.style.color = isLight ? '#333333' : '#cccccc'
                                    }
                                }}
                            >
                                <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Trash2 style={{ width: 17, height: 17, strokeWidth: view === 'trash' ? 2 : 1.75 }} />
                                </div>
                                <span
                                    style={{
                                        marginLeft: 4,
                                        fontSize: 13,
                                        fontWeight: view === 'trash' ? 550 : 450,
                                        letterSpacing: '-0.01em',
                                        whiteSpace: 'nowrap',
                                        opacity: collapsed ? 0 : 1,
                                        transition: 'opacity 0.15s ease',
                                    }}
                                >
                                    Trash
                                </span>
                            </button>
                        </GlassTooltip>
                    </div>
                </div>
            )}
        </motion.aside>
    )
}
