'use client'

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import React from 'react'
import { useSearchParams } from 'next/navigation'
import { useAppSelector } from '@/redux/store'
import { useAutosaveProjectMutation } from '@/redux/api/project'

const AutoSave = () => {
    const searchParams = useSearchParams()
    const projectId = searchParams.get('project')
    const user = useAppSelector((state) => state.profile)
    const shapesState = useAppSelector((state) => state.shapes)
    const viewportState = useAppSelector((state) => state.viewport)
    const subscription = useAppSelector((state) => state.profile?.subscription)
    const isPro = subscription?.status === 'active'

    const [autosaveProject, { isLoading: isSaving }] = useAutosaveProjectMutation()

    const abortRef = React.useRef<AbortController | null>(null)
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastSaveTimeRef = React.useRef<string>('')

    const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

    const isReady = Boolean(projectId && user?.id)

    React.useEffect(() => {
        if (!isReady) return
        const stateString = JSON.stringify({
            shapes: shapesState,
            viewport: viewportState
        })

        if (stateString === lastSaveTimeRef.current) return

        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        
        

        debounceRef.current = setTimeout(async () => {
            lastSaveTimeRef.current = stateString
            if (abortRef.current) abortRef.current.abort()
            abortRef.current = new AbortController()
            setSaveStatus('saving')

            try {
                await autosaveProject({
                    projectId: projectId as string,
                    shapesData: shapesState,
                    viewportData: {
                        scale: viewportState.scale,
                        translate: viewportState.translate,
                    },
                    userId: user?.id as string,
                    isPro
                }).unwrap()
                setSaveStatus('saved')
                setTimeout(() => {
                    setSaveStatus('idle')
                }, 2000) 
            } catch (error) {
                if ((error as Error)?.name === 'AbortError') return
                setSaveStatus('error')
                setTimeout(() => {
                    setSaveStatus('idle')
                }, 3000)
            }

            return () => {
                if (debounceRef.current) {
                    clearTimeout(debounceRef.current)
                }
            }
        }, 1000)
    }, [isReady, shapesState, viewportState, autosaveProject, user?.id])

    React.useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current)
            }
            if (abortRef.current) {
                abortRef.current.abort()
            }
        }
    }, [])

    if (!isReady) return null

    if (isSaving) {
        return (
            <div className='flex items-center'>
                <Loader2 className="w-4 h-4 animate-spin" />
            </div>
        )
    }

    switch (saveStatus) {     
        case 'saved':
            return (
                <div className='flex items-center'>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
            )
        case 'error':
            return (
                <div className='flex items-center'>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
            )

        default:
            return <></>
    }
}

export default AutoSave