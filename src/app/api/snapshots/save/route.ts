import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
    try {
        const { shapeId, projectId, storageId } = await request.json()

        if (!shapeId || !projectId || !storageId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const result = await convex.mutation('snapshots:saveSnapshot' as any, {
            projectId,
            shapeId,
            storageId,
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('Save snapshot failed:', error)
        return NextResponse.json(
            { error: 'Failed to save snapshot' },
            { status: 500 }
        )
    }
}
