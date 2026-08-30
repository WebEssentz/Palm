'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useAppSelector } from '@/redux/store'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { Cloud, CloudUpload, CloudOff, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const AutoSave = () => {
    const searchParams = useSearchParams()
    const projectId = searchParams.get('project')
    const me = useQuery(api.user.getCurrentUser)
    const isValidProjectId = projectId && projectId.length === 32
    const project = useQuery(
        api.projects.getProject,
        isValidProjectId ? { projectId: projectId as Id<'projects'> } : 'skip'
    )
    const shapesState = useAppSelector((state) => state.shapes)
    const viewportState = useAppSelector((state) => state.viewport)
    const updateProjectSketches = useMutation(api.projects.updateProjectSketches)
    const { theme, systemTheme } = useTheme()
    const isLight = (theme === 'system' ? systemTheme : theme) === 'light'

    const isInitializedRef = React.useRef(false)
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastSaveTimeRef = React.useRef<string>('')
    const latestStateRef = React.useRef({ shapesState, viewportState })
    const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

    latestStateRef.current = { shapesState, viewportState }

    // Ensure we don't autosave until project is loaded from Convex
    React.useEffect(() => {
        if (project !== undefined && !isInitializedRef.current) {
            isInitializedRef.current = true
            lastSaveTimeRef.current = JSON.stringify({
                shapes: project.sketchesData || shapesState,
                viewport: project.viewportData || { scale: viewportState.scale, translate: viewportState.translate }
            })
        }
    }, [project, shapesState, viewportState])

    const isReady = Boolean(isValidProjectId && me?._id && isInitializedRef.current)

    React.useEffect(() => {
        if (!isReady || !projectId) return
        const stateString = JSON.stringify({
            shapes: shapesState,
            viewport: { scale: viewportState.scale, translate: viewportState.translate }
        })
        if (stateString === lastSaveTimeRef.current) return
        if (debounceRef.current) clearTimeout(debounceRef.current)

        debounceRef.current = setTimeout(async () => {
            lastSaveTimeRef.current = stateString
            setSaveStatus('saving')

            try {
                await updateProjectSketches({
                    projectId: projectId as Id<'projects'>,
                    sketchesData: shapesState,
                    viewportData: { scale: viewportState.scale, translate: viewportState.translate }
                })
                setSaveStatus('saved')
                setTimeout(() => setSaveStatus('idle'), 2000)
            } catch (error) {
                console.error('Autosave error:', error)
                setSaveStatus('error')
                setTimeout(() => setSaveStatus('idle'), 3000)
            }
        }, 1000)
    }, [isReady, projectId, shapesState, viewportState, updateProjectSketches])

    // Flush any pending save on unmount or beforeunload
    React.useEffect(() => {
        const handleBeforeUnload = () => {
            if (!projectId || !isInitializedRef.current) return
            const stateString = JSON.stringify({
                shapes: latestStateRef.current.shapesState,
                viewport: { scale: latestStateRef.current.viewportState.scale, translate: latestStateRef.current.viewportState.translate }
            })
            if (stateString !== lastSaveTimeRef.current) {
                navigator.sendBeacon?.('/api/project', JSON.stringify({
                    projectId,
                    userId: me?._id,
                    shapesData: latestStateRef.current.shapesState,
                    viewportData: { scale: latestStateRef.current.viewportState.scale, translate: latestStateRef.current.viewportState.translate }
                }))
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [projectId, me?._id])

    if (!isValidProjectId) return null

    const iconColor = isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)'
    const savedColor = isLight ? '#16a34a' : '#4ade80'
    const errorColor = isLight ? '#dc2626' : '#f87171'

    const content = () => {
        if (saveStatus === 'saving') {
            return (
                <motion.div
                    key="saving"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1.5"
                >
                    <CloudUpload className="w-3.5 h-3.5 animate-pulse" style={{ color: iconColor }} />
                    <span className="text-xs font-medium" style={{ color: iconColor }}>Saving</span>
                </motion.div>
            )
        }
        if (saveStatus === 'saved') {
            return (
                <motion.div
                    key="saved"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1.5"
                >
                    <div className="relative">
                        <Cloud className="w-3.5 h-3.5" style={{ color: savedColor }} />
                        <Check className="w-2 h-2 absolute -bottom-0.5 -right-0.5" style={{ color: savedColor }} strokeWidth={3} />
                    </div>
                    <span className="text-xs font-medium" style={{ color: savedColor }}>Saved</span>
                </motion.div>
            )
        }
        if (saveStatus === 'error') {
            return (
                <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1.5"
                >
                    <CloudOff className="w-3.5 h-3.5" style={{ color: errorColor }} />
                    <span className="text-xs font-medium" style={{ color: errorColor }}>Error</span>
                </motion.div>
            )
        }
        return (
            <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
            >
                <Cloud className="w-3.5 h-3.5" style={{ color: iconColor }} />
            </motion.div>
        )
    }

    return (
        <div
            className="h-8 px-3 rounded-full flex items-center justify-center relative border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-xs"
        >
            <AnimatePresence mode="wait">
                {content()}
            </AnimatePresence>
        </div>
    )
}

export default AutoSave