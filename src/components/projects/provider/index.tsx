'use client'

import { loadProject } from '@/redux/slice/shapes';
import { restoreViewport } from '@/redux/slice/viewport';
import { useAppDispatch } from '@/redux/store';
import React from 'react'

type Props = { children: React.ReactNode; initialProject: any }

const ProjectProvider = ({ children, initialProject }: Props) => {
    const dispatch = useAppDispatch()
    
    React.useEffect(() => {
        if (initialProject?._valueJSON?.sketchesData) {
            const projectData = initialProject._valueJSON

            dispatch(loadProject(projectData.sketchesData))

            if (projectData.viewportData) {
                dispatch(restoreViewport(projectData.viewportData))
            }
        }
    }, [dispatch, initialProject])


  return <>{children}</>
}

export default ProjectProvider