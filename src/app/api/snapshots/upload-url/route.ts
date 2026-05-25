import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
    try {
        const uploadUrl = await convex.mutation('file:generateUploadUrl' as any)
        
        return NextResponse.json({ 
            url: uploadUrl,
            storageId: null // storageId will be determined after upload
        })
    } catch (error) {
        console.error('Upload URL generation failed:', error)
        return NextResponse.json(
            { error: 'Failed to generate upload URL' },
            { status: 500 }
        )
    }
}
