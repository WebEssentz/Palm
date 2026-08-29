import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { api } from '../../../../../convex/_generated/api'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
    const chatId = req.nextUrl.searchParams.get('chatId')

    if (chatId && chatId !== 'undefined' && chatId !== 'null') {
        const turns = await fetchQuery(api.chat.getByChat, { chatId })
        return Response.json(turns)
    }

    return Response.json([])
}

export async function POST(req: NextRequest) {
    const body = await req.json()
    const { projectId, chatId, turnId, prompt, response, timestamp, urls, imageStorageIds } = body

    if (!projectId || !turnId) return new Response('Missing fields', { status: 400 })

    await fetchMutation(api.chat.saveTurn, {
        projectId,
        chatId: chatId || undefined,
        turnId,
        prompt,
        response,
        timestamp,
        urls,
        imageStorageIds,
    })
    return Response.json({ success: true })
}
