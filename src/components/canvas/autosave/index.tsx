'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useAppSelector } from '@/redux/store'
import { useAutosaveProjectMutation } from '@/redux/api/project'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Cloud, CloudUpload, CloudOff, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const AutoSave = () => {
    const searchParams = useSearchParams()
    const projectId = searchParams.get('project')
    const me = useQuery(api.user.getCurrentUser)
    const shapesState = useAppSelector((state) => state.shapes)
    const viewportState = useAppSelector((state) => state.viewport)
    const isPro = useQuery(
        api.subscription.hasEntitlement,
        me?._id ? { userId: me._id } : 'skip'
    )
    const { theme, systemTheme } = useTheme()
    const isLight = (theme === 'system' ? systemTheme : theme) === 'light'

    const [autosaveProject, { isLoading: isSaving }] = useAutosaveProjectMutation()

    const abortRef = React.useRef<AbortController | null>(null)
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastSaveTimeRef = React.useRef<string>('')
    const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

    const isReady = Boolean(projectId && me?._id)

    React.useEffect(() => {
        if (!isReady) return
        const stateString = JSON.stringify({ shapes: shapesState, viewport: viewportState })
        if (stateString === lastSaveTimeRef.current) return
        if (debounceRef.current) clearTimeout(debounceRef.current)

        debounceRef.current = setTimeout(async () => {
            lastSaveTimeRef.current = stateString
            if (abortRef.current) abortRef.current.abort()
            abortRef.current = new AbortController()
            setSaveStatus('saving')

            try {
                await autosaveProject({
                    projectId: projectId as string,
                    shapesData: shapesState,
                    viewportData: { scale: viewportState.scale, translate: viewportState.translate },
                    userId: me?._id as string,
                    isPro: !!isPro
                }).unwrap()
                setSaveStatus('saved')
                setTimeout(() => setSaveStatus('idle'), 2000)
            } catch (error) {
                if ((error as Error)?.name === 'AbortError') return
                setSaveStatus('error')
                setTimeout(() => setSaveStatus('idle'), 3000)
            }
        }, 1000)
    }, [isReady, shapesState, viewportState, autosaveProject, me?._id, isPro])

    React.useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            if (abortRef.current) abortRef.current.abort()
        }
    }, [])

    if (!isReady) return null

    const iconColor = isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)'
    const savedColor = isLight ? '#16a34a' : '#4ade80'
    const errorColor = isLight ? '#dc2626' : '#f87171'

    const content = () => {
        if (saveStatus === 'saving' || isSaving) {
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
            className="h-8 px-3 rounded-full flex items-center justify-center relative border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900"
        >
            <AnimatePresence mode="wait">
                {content()}
            </AnimatePresence>
        </div>
    )
}

export default AutoSave