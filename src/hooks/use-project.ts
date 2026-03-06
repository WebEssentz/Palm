'use client'

import { useAppDispatch, useAppSelector } from "@/redux/store"
import { addProject, createProjectFailure, createProjectStart, createProjectSuccess } from "@/redux/slice/projects"
import { toast } from 'sonner'
import { fetchMutation } from "convex/nextjs";
import { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";

const generateGradientThumbnail = () => {
    const gradients = [
        ["#667eea", "#764ba2"],
        ["#f093fb", "#f5576c"],
        ["#4facfe", "#00f2fe"],
        ["#43e97b", "#38f9d7"],
        ["#fa709a", "#fee140"],
        ["#a8edea", "#fed6e3"],
        ["#ff9a9e", "#fecfef"],
        ["#ffecd2", "#fcb69f"],
    ]
    const [color1, color2] = gradients[Math.floor(Math.random() * gradients.length)]
    
    return `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1}" />
          <stop offset="100%" style="stop-color:${color2}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
      <circle cx="150" cy="100" r="30" fill="white" opacity="0.8" />
      <path d="M140 90 L160 90 L160 110 L140 110 Z" fill="white" opacity="0.6" />
    </svg>`
}


export const useProjectCreation = () => {
    const dispatch = useAppDispatch()
    const user = useAppSelector((state) => state.profile)
    const projectsState = useAppSelector((state) => state.projects)
    const shapesState = useAppSelector((state) => state.shapes)

    const createProject = async (name?: string) => {
        if (!user?.id) {
            toast.error('Please sign in to create projects')
            return
        }
        dispatch(createProjectStart())
        try {
            // 1. Generate SVG
            const svgContent = generateGradientThumbnail()
            const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' })

            // 2. Get Convex upload URL
            const uploadUrl = await fetchMutation(api.files.generateUploadUrl)

            // 3. Upload blob to Convex storage
            const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'image/svg+xml' },
                body: svgBlob,
            })
            const { storageId } = await uploadResponse.json()

            // 4. Create project with storageId
            const result = await fetchMutation(api.projects.createProject, {
                userId: user.id as Id<'users'>,
                name: name || undefined,
                sketchesData: {
                    shapes: shapesState.shapes,
                    tool: shapesState.tool,
                    selected: shapesState.selected,
                    framerCounter: shapesState.framerCounter,
                },
                thumbnail: storageId,
            })

            dispatch(createProjectSuccess())
        } catch (error) {
            dispatch(createProjectFailure('Failed to create project'))
            toast.error('Failed to create project')
        }
    }

    return {
        createProject,
        isCreating: projectsState.isCreating,
        projects: projectsState.projects,
        projectsTotal: projectsState.total,
        canCreate: !!user?.id,
    }
}