import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
    try {
        const shapeId = request.nextUrl.searchParams.get('shapeId')

        if (!shapeId) {
            return NextResponse.json(
                { error: 'Missing shapeId' },
                { status: 400 }
            )
        }

        const result = await convex.query('snapshots:getSnapshot' as any, {
            shapeId,
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('Get snapshot failed:', error)
        return NextResponse.json(
            { error: 'Failed to get snapshot' },
            { status: 500 }
        )
    }
}
