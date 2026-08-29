'use client'

import InfiniteCanvas from "@/components/canvas"
import ProjectProvider from "@/components/projects/provider"
import { useQuery } from "convex/react"
import { api } from "../../../../../../../convex/_generated/api"
import { Id } from "../../../../../../../convex/_generated/dataModel"
import { useSearchParams } from "next/navigation"

export default function Page() {
    const params = useSearchParams()
    const rawProjectId = params.get('project')
    const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId

    const project = useQuery(
        api.projects.getProject,
        projectId && projectId.length === 32
            ? { projectId: projectId as Id<'projects'> }
            : 'skip'
    )

    if (!projectId || projectId.length !== 32) {
        return (
            <div className="w-full h-screen flex items-center justify-center">
                <p className="text-muted-foreground">No valid project selected</p>
            </div>
        )
    }

    // project === undefined means still loading — render canvas shell immediately
    // to avoid any blank flash; InfiniteCanvas handles its own loading states
    return (
        <ProjectProvider initialProject={project}>
            <InfiniteCanvas />
        </ProjectProvider>
    )
}