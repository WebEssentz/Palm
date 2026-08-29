import { NextRequest } from 'next/server'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { fetchMutation } from 'convex/nextjs'
import { api } from '../../../../../convex/_generated/api'

export async function POST(req: NextRequest) {
    const { chatId, prompt } = await req.json()

    if (!chatId || !prompt) {
        return new Response('Missing chatId or prompt', { status: 400 })
    }

    try {
        const { text } = await generateText({
            model: google('gemini-3.5-flash-lite'),
            system: 'You generate short, 3-4 word descriptive titles for design chat threads. Return ONLY the title in Title Case, no quotes, no trailing punctuation.',
            prompt: `User message: "${prompt.slice(0, 300)}"`,
            maxOutputTokens: 20,
            temperature: 0.4,
        })

        const title = text.replace(/^["']|["']$/g, '').trim().slice(0, 50)

        if (title) {
            await fetchMutation(api.chat.renameChat, {
                chatId: chatId as any,
                title,
            })
        }

        return Response.json({ title })
    } catch (err) {
        console.error('Title generation failed:', err)
        return Response.json({ title: null })
    }
}
