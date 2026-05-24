'use client'

import { loadProject } from '@/redux/slice/shapes';
import { restoreViewport } from '@/redux/slice/viewport';
import { setProjectMetadata } from '@/redux/slice/project';
import { useAppDispatch } from '@/redux/store';
import React from 'react'

type Props = { children: React.ReactNode; initialProject: any }

const ProjectProvider = ({ children, initialProject }: Props) => {
    const dispatch = useAppDispatch()
    
    React.useEffect(() => {
        // Always load shapes and viewport from the project
        // The URL prompt (if present) is for context, not for skipping the load
        if (initialProject?._valueJSON) {
            const projectData = initialProject._valueJSON

            dispatch(loadProject(projectData.sketchesData))

            if (projectData.viewportData) {
                dispatch(restoreViewport(projectData.viewportData))
            }

            // Store project metadata (including referenceUrls)
            dispatch(setProjectMetadata({
                id: initialProject._id,
                referenceUrls: projectData.referenceUrls ?? [],
            }))
        }
    }, [dispatch, initialProject?._id])

  return <>{children}</>
}

export default ProjectProvider