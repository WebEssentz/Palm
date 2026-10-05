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
import { toPng } from 'html-to-image'

const serializeCanvas = (shapes: any, frameCounter: number, viewport: any) => {
    return JSON.stringify({
        shapes: shapes ?? { ids: [], entities: {} },
        frameCounter: frameCounter ?? 0,
        viewport: {
            scale: Math.round((viewport?.scale ?? 1) * 1000) / 1000,
            x: Math.round((viewport?.translate?.x ?? 0) * 10) / 10,
            y: Math.round((viewport?.translate?.y ?? 0) * 10) / 10,
        }
    })
}

const AutoSave = () => {
    const searchParams = useSearchParams()
    const projectId = searchParams.get('project')
    const me = useQuery(api.user.getCurrentUser)
    const isValidProjectId = Boolean(projectId && projectId !== 'null' && projectId !== 'undefined')
    const shapesState = useAppSelector((state) => state.shapes)
    const viewportState = useAppSelector((state) => state.viewport)
    const updateProjectSketches = useMutation(api.projects.updateProjectSketches)
    const generateUploadUrl = useMutation(api.files.generateUploadUrl)
    const updateProjectThumbnail = useMutation(api.projects.updateProjectThumbnail)
    const { theme, systemTheme } = useTheme()
    const isLight = (theme === 'system' ? systemTheme : theme) === 'light'

    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const thumbTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const isCapturingThumbRef = React.useRef(false)
    const lastSavedStringRef = React.useRef<string | null>(null)
    const latestStateRef = React.useRef({ shapesState, viewportState })
    const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

    latestStateRef.current = { shapesState, viewportState }

    const captureThumbnail = React.useCallback(async (targetProjectId: string) => {
        if (isCapturingThumbRef.current) return
        const node = document.querySelector('[aria-label="Infinite drawing canvas"]') as HTMLElement | null
        if (!node) return

        isCapturingThumbRef.current = true
        try {
            const dataUrl = await toPng(node, {
                pixelRatio: 0.4,
                cacheBust: true,
                skipFonts: true,
            })
            const res = await fetch(dataUrl)
            const blob = await res.blob()

            const uploadUrl = await generateUploadUrl()
            const uploadRes = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'image/png' },
                body: blob,
            })
            const { storageId } = await uploadRes.json()

            if (storageId) {
                await updateProjectThumbnail({
                    projectId: targetProjectId as Id<'projects'>,
                    storageId,
                })
            }
        } catch (err) {
            console.warn('[Thumbnail] Auto-capture skipped:', err)
        } finally {
            isCapturingThumbRef.current = false
        }
    }, [generateUploadUrl, updateProjectThumbnail])

    // When the project is first loaded into Redux, establish the baseline state
    // so we don't immediately trigger a redundant save of what was just loaded
    React.useEffect(() => {
        if (shapesState.isLoaded && lastSavedStringRef.current === null) {
            lastSavedStringRef.current = serializeCanvas(
                shapesState.shapes,
                shapesState.frameCounter,
                viewportState
            )
        }
    }, [shapesState.isLoaded, shapesState.shapes, shapesState.frameCounter, viewportState])

    // Reset baseline if project changes
    React.useEffect(() => {
        lastSavedStringRef.current = null
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
            debounceRef.current = null
        }
    }, [projectId])

    // Detect actual canvas changes and debounce save
    React.useEffect(() => {
        if (!isValidProjectId || !projectId || !shapesState.isLoaded) return
        if (lastSavedStringRef.current === null) return

        const currentString = serializeCanvas(
            shapesState.shapes,
            shapesState.frameCounter,
            viewportState
        )

        if (currentString === lastSavedStringRef.current) return

        if (debounceRef.current) clearTimeout(debounceRef.current)

        debounceRef.current = setTimeout(async () => {
            lastSavedStringRef.current = currentString
            setSaveStatus('saving')

            try {
                await updateProjectSketches({
                    projectId: projectId as Id<'projects'>,
                    sketchesData: {
                        shapes: shapesState.shapes,
                        tool: shapesState.tool,
                        selected: shapesState.selected,
                        frameCounter: shapesState.frameCounter,
                    },
                    viewportData: {
                        scale: viewportState.scale,
                        translate: viewportState.translate,
                    }
                })
                setSaveStatus('saved')
                setTimeout(() => setSaveStatus('idle'), 2000)

                // Silently capture canvas thumbnail in background a few seconds after editing
                if (thumbTimeoutRef.current) clearTimeout(thumbTimeoutRef.current)
                thumbTimeoutRef.current = setTimeout(() => {
                    captureThumbnail(projectId)
                }, 2500)
            } catch (error) {
                console.error('Autosave error:', error)
                setSaveStatus('error')
                setTimeout(() => setSaveStatus('idle'), 3000)
            }
        }, 1000)
    }, [isValidProjectId, projectId, shapesState, viewportState, updateProjectSketches, captureThumbnail])

    // Flush any pending save on beforeunload or unmount
    React.useEffect(() => {
        const handleBeforeUnload = () => {
            if (!projectId || !latestStateRef.current.shapesState.isLoaded) return
            const currentString = serializeCanvas(
                latestStateRef.current.shapesState.shapes,
                latestStateRef.current.shapesState.frameCounter,
                latestStateRef.current.viewportState
            )
            if (lastSavedStringRef.current !== null && currentString !== lastSavedStringRef.current) {
                const payload = JSON.stringify({
                    projectId,
                    userId: me?._id,
                    shapesData: {
                        shapes: latestStateRef.current.shapesState.shapes,
                        tool: latestStateRef.current.shapesState.tool,
                        selected: latestStateRef.current.shapesState.selected,
                        frameCounter: latestStateRef.current.shapesState.frameCounter,
                    },
                    viewportData: {
                        scale: latestStateRef.current.viewportState.scale,
                        translate: latestStateRef.current.viewportState.translate,
                    }
                })
                const blob = new Blob([payload], { type: 'application/json' })
                navigator.sendBeacon?.('/api/project', blob)
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current)
                handleBeforeUnload()
            }
            if (thumbTimeoutRef.current) {
                clearTimeout(thumbTimeoutRef.current)
            }
            if (projectId && latestStateRef.current.shapesState.shapes?.ids?.length > 0) {
                captureThumbnail(projectId)
            }
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [projectId, me?._id, captureThumbnail])

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