'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useAppSelector } from '@/redux/store'
import { useAutosaveProjectMutation } from '@/redux/api/project'
import { Cloud, CloudUpload, CloudOff, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const AutoSave = () => {
    const searchParams = useSearchParams()
    const projectId = searchParams.get('project')
    const user = useAppSelector((state) => state.profile)
    const shapesState = useAppSelector((state) => state.shapes)
    const viewportState = useAppSelector((state) => state.viewport)
    const subscription = useAppSelector((state) => state.profile?.subscription)
    const isPro = subscription?.status === 'active'
    const { theme, systemTheme } = useTheme()
    const isLight = (theme === 'system' ? systemTheme : theme) === 'light'

    const [autosaveProject, { isLoading: isSaving }] = useAutosaveProjectMutation()

    const abortRef = React.useRef<AbortController | null>(null)
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastSaveTimeRef = React.useRef<string>('')
    const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

    const isReady = Boolean(projectId && user?.id)

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
                    userId: user?.id as string,
                    isPro
                }).unwrap()
                setSaveStatus('saved')
                setTimeout(() => setSaveStatus('idle'), 2000)
            } catch (error) {
                if ((error as Error)?.name === 'AbortError') return
                setSaveStatus('error')
                setTimeout(() => setSaveStatus('idle'), 3000)
            }
        }, 1000)
    }, [isReady, shapesState, viewportState, autosaveProject, user?.id])

    React.useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            if (abortRef.current) abortRef.current.abort()
        }
    }, [])

    if (!isReady) return null

    const liquidGlass: React.CSSProperties = isLight ? {
        background: 'rgba(250,246,238,0.92)',
        backdropFilter: 'blur(32px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
        border: '1px solid rgba(120,96,60,0.14)',
        boxShadow: [
            '0 0 0 0.5px rgba(100,76,40,0.08)',
            '0 4px 24px rgba(80,60,30,0.14)',
            '0 8px 32px rgba(80,60,30,0.10)',
            'inset 0 1px 0 rgba(255,255,255,0.95)',
            'inset 0 -1px 0 rgba(100,76,40,0.04)',
        ].join(', '),
    } : {
        background: 'rgba(18,18,18,0.85)',
        backdropFilter: 'blur(32px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: [
            '0 0 0 0.5px rgba(255,255,255,0.04)',
            '0 4px 24px rgba(0,0,0,0.45)',
            '0 8px 32px rgba(0,0,0,0.35)',
            'inset 0 1px 0 rgba(255,255,255,0.08)',
            'inset 0 -1px 0 rgba(0,0,0,0.2)',
        ].join(', '),
    }

    const iconColor = isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'
    const savedColor = isLight ? 'rgba(34,197,94,0.9)' : 'rgba(74,222,128,0.9)'
    const errorColor = isLight ? 'rgba(239,68,68,0.9)' : 'rgba(248,113,113,0.9)'

    const content = () => {
        if (saveStatus === 'saving' || isSaving) {
            return (
                <motion.div
                    key="saving"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5"
                >
                    <CloudUpload
                        className="w-3.5 h-3.5 animate-pulse"
                        style={{ color: iconColor }}
                    />
                    <span className="text-xs font-medium" style={{ color: iconColor }}>
                        Saving
                    </span>
                </motion.div>
            )
        }
        if (saveStatus === 'saved') {
            return (
                <motion.div
                    key="saved"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5"
                >
                    <div className="relative">
                        <Cloud className="w-3.5 h-3.5" style={{ color: savedColor }} />
                        <Check
                            className="w-2 h-2 absolute -bottom-0.5 -right-0.5"
                            style={{ color: savedColor }}
                            strokeWidth={3}
                        />
                    </div>
                    <span className="text-xs font-medium" style={{ color: savedColor }}>
                        Saved
                    </span>
                </motion.div>
            )
        }
        if (saveStatus === 'error') {
            return (
                <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5"
                >
                    <CloudOff className="w-3.5 h-3.5" style={{ color: errorColor }} />
                    <span className="text-xs font-medium" style={{ color: errorColor }}>
                        Error
                    </span>
                </motion.div>
            )
        }
        // idle
        return (
            <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
            >
                <Cloud className="w-3.5 h-3.5" style={{ color: iconColor }} />
            </motion.div>
        )
    }

    return (
        <div
            className="h-8 px-3 rounded-full flex items-center justify-center relative"
            style={liquidGlass}
        >
            {/* specular rim */}
            <div
                className="pointer-events-none absolute inset-x-0 top-0 h-[1px] rounded-full"
                style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.90) 50%, transparent 90%)' }}
            />
            <AnimatePresence mode="wait">
                {content()}
            </AnimatePresence>
        </div>
    )
}

export default AutoSave