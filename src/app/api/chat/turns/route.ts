import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { api } from '../../../../../convex/_generated/api'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
    const projectId = req.nextUrl.searchParams.get('projectId')
    if (!projectId) return new Response('Missing projectId', { status: 400 })

    const turns = await fetchQuery(api.chat.getByProject, { projectId })
    return Response.json(turns)
}

export async function POST(req: NextRequest) {
    const body = await req.json()
    const { projectId, turnId, prompt, response, timestamp, urls } = body

    if (!projectId || !turnId) return new Response('Missing fields', { status: 400 })

    await fetchMutation(api.chat.saveTurn, { projectId, turnId, prompt, response, timestamp, urls })
    return Response.json({ success: true })
}
