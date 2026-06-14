import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'

export async function POST(req: NextRequest) {
    try {
        const { urls, prompt } = await req.json()
        if (!urls?.length) return NextResponse.json({ error: 'No URLs provided' }, { status: 400 })

        const urlList = urls.join('\n')

        const { text } = await generateText({
            model: google('gemini-3.5-flash'),
            tools: {
                url_context: google.tools.urlContext({}),
            },
            messages: [{
                role: 'user',
                content: `You are a UI/UX design analyst. Analyze the following website(s) and extract a rich design prompt.

URLs to analyze:
${urlList}

${urls.length > 1
    ? `The first URL is the primary visual reference — extract its color palette, typography, spacing, and component patterns.
The second URL is a layout/structure reference — extract its information architecture and layout approach.
Blend both into a single unified prompt.`
    : `Extract the visual style, color palette, typography, spacing, component patterns, and layout approach.`
}

The user's original intent: "${prompt}"

Return ONLY a single enhanced prompt string (no JSON, no explanation, no preamble) that combines:
- The visual design DNA from the reference site(s)
- The user's original intent
- Specific UI component descriptions
- Color and typography direction
- Layout and spacing notes

The prompt should be 3-6 sentences, specific, and ready to feed directly into a UI generation model.`
            }],
            providerOptions: {
                google: {
                    thinkingConfig: {
                        thinkingLevel: 'low',
                        includeThoughts: false,
                    }
                }
            }
        })

        return NextResponse.json({ enhanced: text.trim() })
    } catch (err) {
        console.error('URL analyze error:', err)
        return NextResponse.json({ error: 'Failed to analyze URLs' }, { status: 500 })
    }
}