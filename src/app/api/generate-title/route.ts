// src/app/api/generate-title/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'


export async function POST(req: NextRequest) {
    try {
        const { userPrompt, htmlSnippet } = await req.json()

        if (!userPrompt) {
            return NextResponse.json({ error: 'Missing userPrompt' }, { status: 400 })
        }

        // Pull a small excerpt from the HTML to give the model structural context
        // without blowing up the context window
        const htmlContext = htmlSnippet
            ? htmlSnippet.slice(0, 1200).replace(/<style[\s\S]*?<\/style>/gi, '').trim()
            : ''

        const { text } = await generateText({
            model: google('gemini-3.1-flash-lite'),
            system: [
                'You generate short, descriptive project titles for UI designs.',
                'Rules:',
                '- Maximum 4 words',
                '- Title case (e.g. "Coffee Shop Landing Page")',
                '- Be specific to the actual content, not generic',
                '- No quotes, no punctuation at the end',
                '- Prefer nouns over verbs (e.g. "Analytics Dashboard" not "View Analytics")',
                '- If the prompt is vague, use the HTML context to infer the UI type',
                '- Output ONLY the title, nothing else',
            ].join('\n'),
            prompt: [
                '## User Prompt',
                `"${userPrompt}"`,
                '',
                htmlContext ? '## HTML Context (excerpt)' : '',
                htmlContext ? htmlContext : '',
            ].filter(Boolean).join('\n'),
            temperature: 0.4,
        })

        const title = text.replace(/^["']|["']$/g, '').trim()

        return NextResponse.json({ title })
    } catch (error) {
        console.error('Title generation error:', error)
        return NextResponse.json(
            { error: 'Failed to generate title', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}