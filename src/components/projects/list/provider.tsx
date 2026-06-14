"use client"
import React, { createContext, useContext, useState, type ReactNode } from 'react'

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
export const useProjects = () => {
    const projects = useContext(ProjectsContext)
    // Safety guard: ensure projects is always an array
    return Array.isArray(projects) ? projects : []
}

type Props = {
    children: ReactNode
    initialProjects: Project[]
}

const ProjectsProvider = ({ children, initialProjects }: Props) => {
    return (
        <ProjectsContext.Provider value={initialProjects}>
            {children}
        </ProjectsContext.Provider>
    )
}

export default ProjectsProvider