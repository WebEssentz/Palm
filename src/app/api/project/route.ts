import { inngest } from "@/inngest/client";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { NextRequest } from "next/server";

interface UpdateProjectRequest {
    projectId: string
    shapesData: {
        shapes: Record<string, unknown>
        tool: string
        selected: Record<string, unknown>
        frameCounter?: number
    }
    viewportData?: {
        scale: number
        translate: { x: number; y: number }
    }
    userId?: string
    isPro?: boolean
}

async function handleUpdate(req: NextRequest) {
    try {
        let body: UpdateProjectRequest
        try {
            body = await req.json()
        } catch {
            const rawText = await req.text()
            body = JSON.parse(rawText)
        }

        const { projectId, shapesData, viewportData, userId, isPro } = body

        if (!projectId || !shapesData) {
            return new Response('Missing required fields', { status: 400 })
        }

        if (isPro && userId) {
            try {
                // Pro path — Inngest handles it (retries, monitoring, guaranteed)
                const eventResult = await inngest.send({
                    name: 'project/autosave.requested',
                    data: { projectId, shapesData, viewportData, userId }
                })
                return new Response(
                    JSON.stringify({ success: true, via: 'inngest', eventId: eventResult }),
                    { status: 200 }
                )
            } catch (inngestError) {
                console.error('Inngest send failed, falling back to direct save:', inngestError)
                // Fall through to direct save below
            }
        }

        // Free path / fallback — save directly, no Inngest
        await fetchMutation(api.projects.updateProjectSketches, {
            projectId: projectId as Id<"projects">,
            sketchesData: shapesData,
            viewportData
        })
        return new Response(
            JSON.stringify({ success: true, via: 'direct' }),
            { status: 200 }
        )

    } catch (error) {
        console.error('Error saving project:', error)
        return new Response(JSON.stringify({ success: false }), { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    return handleUpdate(req)
}

export async function PATCH(req: NextRequest) {
    return handleUpdate(req)
}