import InfiniteCanvas from "@/components/canvas"
import ProjectProvider from "@/components/projects/provider"
import { ProjectQuery } from "@/convex/query.config"

interface CanvasPageProps {
    searchParams: Promise<{ project?: string | string[] }>
}

const Page = async ({ searchParams }: CanvasPageProps) => {

    const params = await searchParams
    const rawProjectId = params.project
    const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId

    if (!projectId || typeof projectId !== 'string' || projectId === '[object Object]' || projectId.length !== 32) {
        return (
            <div className="w-full h-screen flex items-center justify-center">
                <p className="text-muted-foreground">No valid project selected</p>
            </div>
        )
    }

    const { project, profile } = await ProjectQuery(projectId)
    if (!profile) {
        return (
            <div className="w-full h-screen flex items-center justify-center">
                <p className="text-muted-foreground">
                    Authentication required
                </p>
            </div>
        )
    }

    if (!project) {
        return (
            <div className="w-full h-screen flex items-center justify-center">
                <p className="text-red-500">
                    Project not found or access denied
                </p>
            </div>
        )
    }

    return (
        <ProjectProvider initialProject={project}>
            <InfiniteCanvas />
        </ProjectProvider>
    )

}

export default Page