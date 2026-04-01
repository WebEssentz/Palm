'use client'

import { loadProject } from '@/redux/slice/shapes';
import { restoreViewport } from '@/redux/slice/viewport';
import { useAppDispatch } from '@/redux/store';
import { useSearchParams } from 'next/navigation';
import React from 'react'

type Props = { children: React.ReactNode; initialProject: any }

const ProjectProvider = ({ children, initialProject }: Props) => {
    const dispatch = useAppDispatch()
    const searchParams = useSearchParams()
    
    React.useEffect(() => {
        // Skip loading if prompt is in URL — canvas generation is starting
        const urlPrompt = searchParams.get('prompt')
        if (urlPrompt) return

        if (initialProject?._valueJSON?.sketchesData) {
            const projectData = initialProject._valueJSON

            dispatch(loadProject(projectData.sketchesData))

            if (projectData.viewportData) {
                dispatch(restoreViewport(projectData.viewportData))
            }
        }
    }, [dispatch, initialProject?._id])  // ← Remove searchParams from deps!


  return <>{children}</>
}

export default ProjectProvider