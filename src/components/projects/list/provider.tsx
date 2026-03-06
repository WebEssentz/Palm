"use client"
import { usePreloadedQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Preloaded } from 'convex/react'
import React, { createContext, useContext, type ReactNode } from 'react'

type Project = {
    _id: string
    name: string
    projectNumber: number
    thumbnail?: string
    lastModified: number
    createdAt: number
    isPublic?: boolean
}

const ProjectsContext = createContext<Project[]>([])
export const useProjects = () => useContext(ProjectsContext)

type Props = {
    children: ReactNode
    initialProjects: Preloaded<typeof api.projects.getUserProjects>
}

const ProjectsProvider = ({ children, initialProjects }: Props) => {
    const projects = usePreloadedQuery(initialProjects)
    return (
        <ProjectsContext.Provider value={projects as Project[]}>
            {children}
        </ProjectsContext.Provider>
    )
}

export default ProjectsProvider