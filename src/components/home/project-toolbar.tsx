'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Lock, Globe } from 'lucide-react'

/**
 * Filter mode for project visibility:
 * - 'all': All projects (both public and private) in a unified view
 * - 'workspace': Shared / public projects visible to everyone in the workspace
 * - 'private': Personal projects visible only to the creator
 */
export type ProjectVisibilityTab = 'all' | 'workspace' | 'private'

interface ProjectToolbarProps {
    /** Currently selected tab */
    activeTab: ProjectVisibilityTab
    /** Callback when tab is changed */
    onTabChange: (tab: ProjectVisibilityTab) => void
    /** Theme mode */
    isLight: boolean
    /** Foreground text color */
    text: string
    /** Muted foreground text color */
    muted: string
    /** Border color */
    border: string
    /** Optional custom workspace name */
    workspaceName?: string
}

/**
 * ProjectToolbar Component
 *
 * Streamlined filter bar for projects:
 * - Fluid segmented control: [ All ] [ 🌐 Public ] [ 🔒 Private ]
 * - Search is placed alongside greetings at the top right
 * - Redundant navbar button removed
 */
export default function ProjectToolbar({
    activeTab,
    onTabChange,
    isLight,
    text,
    muted,
    border,
}: ProjectToolbarProps) {
    const tabs: { id: ProjectVisibilityTab; label: string; icon?: React.ReactNode }[] = [
        { id: 'all', label: 'All' },
        { id: 'workspace', label: 'Public', icon: <Globe style={{ width: 13, height: 13 }} /> },
        { id: 'private', label: 'Private', icon: <Lock style={{ width: 12, height: 12 }} /> },
    ]

    return (
        <div
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                margin: '8px 0 24px',
            }}
        >
            {/* ── Segmented Pill Filter (All / Public / Private) ── */}
            <div
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: 3,
                    borderRadius: 11,
                    background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${border}`,
                    position: 'relative',
                }}
            >
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            type="button"
                            style={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '5.5px 14px',
                                fontSize: 13,
                                fontWeight: isActive ? 600 : 450,
                                color: isActive ? text : muted,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                borderRadius: 8,
                                zIndex: 1,
                                transition: 'color 0.15s ease',
                                outline: 'none',
                            }}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeFilterPill"
                                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        borderRadius: 8,
                                        background: isLight ? '#ffffff' : '#1f1f1f',
                                        boxShadow: isLight
                                            ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 1px rgba(0,0,0,0.04)'
                                            : '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)',
                                        zIndex: -1,
                                    }}
                                />
                            )}
                            {tab.icon && (
                                <span style={{ display: 'inline-flex', opacity: isActive ? 1 : 0.65 }}>
                                    {tab.icon}
                                </span>
                            )}
                            <span>{tab.label}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
