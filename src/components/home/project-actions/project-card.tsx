'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, MoreHorizontal, Lock, Globe } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ProjectActionItem } from './types'

interface ProjectCardProps {
    project: ProjectActionItem
    userSlug: string
    isLight: boolean
    text: string
    muted: string
    border: string
    isSelected: boolean
    isSelectionActive: boolean
    onToggleSelect: (id: string) => void
    selectedColor?: string // Configurable selected color — defaults dynamically to theme accent
}

export default function ProjectCard({
    project,
    userSlug,
    isLight,
    text,
    muted,
    border,
    isSelected,
    isSelectionActive,
    onToggleSelect,
    selectedColor,
}: ProjectCardProps) {
    const [isHovered, setIsHovered] = useState(false)
    const router = useRouter()

    const hasImg = Boolean(
        project.thumbnail &&
        (project.thumbnail.startsWith('http://') ||
         project.thumbnail.startsWith('https://') ||
         project.thumbnail.startsWith('data:image/'))
    )

    // Dynamic selected color (not hardcoded, easily changed or configured)
    const activeSelectedColor = selectedColor || (isLight ? '#000000' : '#ffffff')
    const activeCheckColor = isLight ? '#ffffff' : '#000000'

    // When hovered, selected, or has an image, border is filled (solid)
    const isSolidBorder = isHovered || isSelected || hasImg
    const borderColor = isSelected
        ? activeSelectedColor
        : isHovered
        ? (isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)')
        : (isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)')

    // Selection circle visible if hovered, selected, or in multi-select mode
    const showSelectionCircle = isHovered || isSelected || isSelectionActive

    const handleClick = (e: React.MouseEvent) => {
        if (isSelectionActive) {
            e.preventDefault()
            onToggleSelect(project._id)
        }
    }

    const handleCircleClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onToggleSelect(project._id)
    }

    const formattedTime = project.lastModified
        ? formatDistanceToNow(new Date(project.lastModified), { addSuffix: true })
        : 'recently'

    const authorText = project.authorName ? `by ${project.authorName}` : ''

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
            style={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 14,
                cursor: 'pointer',
                position: 'relative',
                userSelect: 'none',
                transition: 'transform 0.15s ease',
            }}
        >
            <Link
                href={`/dashboard/${userSlug}/canvas?project=${project._id}`}
                onClick={(e) => {
                    if (isSelectionActive) {
                        e.preventDefault()
                    }
                }}
                style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column' }}
            >
                {/* ── Canvas Box ── */}
                <div
                    style={{
                        width: '100%',
                        aspectRatio: '16/10',
                        borderRadius: 14,
                        overflow: 'hidden',
                        position: 'relative',
                        // On hover on a project card, border should be filled no longer dashed
                        borderWidth: 1.5,
                        borderStyle: isSolidBorder ? 'solid' : 'dashed',
                        borderColor: borderColor,
                        background: isLight ? '#ffffff' : '#0a0a0a',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s ease, border-style 0.1s ease',
                    }}
                >
                    {hasImg && (
                        <img
                            src={project.thumbnail}
                            alt={project.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    )}

                    {/* ── Selection Circle (Top-Left) ── */}
                    <AnimatePresence>
                        {showSelectionCircle && (
                            <motion.button
                                key="selection-circle"
                                type="button"
                                initial={{ opacity: 0, scale: 0.6 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.6 }}
                                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                                onClick={handleCircleClick}
                                aria-label={isSelected ? 'Deselect project' : 'Select project'}
                                style={{
                                    position: 'absolute',
                                    top: 10,
                                    left: 10,
                                    width: 22,
                                    height: 22,
                                    borderRadius: '50%',
                                    border: isSelected
                                        ? `1.5px solid ${activeSelectedColor}`
                                        : `1.5px solid ${isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)'}`,
                                    background: isSelected
                                        ? activeSelectedColor
                                        : (isLight ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'),
                                    backdropFilter: 'blur(6px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    padding: 0,
                                    zIndex: 10,
                                    transition: 'background 0.14s ease, border-color 0.14s ease',
                                }}
                            >
                                <AnimatePresence>
                                    {isSelected && (
                                        <motion.div
                                            key="check-icon"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            transition={{ duration: 0.12 }}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Check
                                                style={{
                                                    width: 13,
                                                    height: 13,
                                                    color: activeCheckColor,
                                                    strokeWidth: 2.75,
                                                }}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* ── Top-Right Badges: Visibility Pill + Type Pill ── */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            zIndex: 5,
                        }}
                    >
                        {/* Public / Private Badge */}
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3.5,
                                padding: '2.5px 7px',
                                borderRadius: 6,
                                fontSize: 10.5,
                                fontWeight: 550,
                                letterSpacing: '-0.01em',
                                background: project.visibility === 'private'
                                    ? (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.09)')
                                    : (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)'),
                                color: project.visibility === 'private'
                                    ? (isLight ? '#1c1c1e' : '#f0f0f0')
                                    : (isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)'),
                                border: `1px solid ${
                                    project.visibility === 'private'
                                        ? (isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)')
                                        : (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)')
                                }`,
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                                userSelect: 'none',
                            }}
                        >
                            {project.visibility === 'private' ? (
                                <Lock style={{ width: 10, height: 10, strokeWidth: 2.2 }} />
                            ) : (
                                <Globe style={{ width: 10, height: 10, strokeWidth: 2 }} />
                            )}
                            <span>{project.visibility === 'private' ? 'Private' : 'Public'}</span>
                        </div>

                        {/* Canvas Type Pill */}
                        <div
                            style={{
                                padding: '2.5px 7px',
                                borderRadius: 6,
                                fontSize: 10.5,
                                fontWeight: 500,
                                letterSpacing: '-0.01em',
                                background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                                color: isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)',
                                border: `1px solid ${isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)'}`,
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                                userSelect: 'none',
                            }}
                        >
                            Canvas
                        </div>
                    </div>
                </div>

                {/* ── Meta & Actions Row ── */}
                <div style={{ padding: '10px 2px 4px' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                        }}
                    >
                        <span
                            style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: text,
                                letterSpacing: '-0.01em',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {project.name}
                        </span>

                        {/* More Horizontal Icon (Bottom Right, visual only for now - ONLY on hover) */}
                        {isHovered && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                }}
                                aria-label="More options"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: muted,
                                    padding: '2px 4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 6,
                                    flexShrink: 0,
                                    transition: 'color 0.12s ease, background 0.12s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = text
                                    e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = muted
                                    e.currentTarget.style.background = 'transparent'
                                }}
                            >
                                <MoreHorizontal style={{ width: 16, height: 16 }} />
                            </button>
                        )}
                    </div>

                    <p
                        style={{
                            fontSize: 12,
                            color: muted,
                            margin: '3px 0 0',
                            letterSpacing: '-0.005em',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Edited {formattedTime} {authorText}
                    </p>
                </div>
            </Link>
        </div>
    )
}
