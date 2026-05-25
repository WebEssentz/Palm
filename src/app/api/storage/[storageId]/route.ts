import { fetchQuery } from 'convex/nextjs'
import { api } from '../../../../../convex/_generated/api'
import { NextResponse } from 'next/server'

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ storageId: string }> }
) {
    const { storageId } = await params
    const url = await fetchQuery(api.files.getUrl, { storageId })
    if (!url) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.redirect(url)
}
