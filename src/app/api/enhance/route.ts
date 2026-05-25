import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    const { prompt } = await req.json()

    if (!prompt?.trim()) {
        return NextResponse.json({ error: 'No prompt provided' }, { status: 400 })
    }

    const { text } = await generateText({
        model: google('gemini-3.1-flash-lite'),
        system: `You are an expert UI/UX design prompt engineer. Your job is to take a user's rough idea and transform it into a rich, specific, well-structured prompt that will produce an exceptional UI design generation.

Follow these rules strictly:

1. PRESERVE THE CORE IDEA — never change what the user wants to build, only enrich it.

2. ADD SPECIFICITY across these dimensions:
   - Component vocabulary: use precise UI terms like "sticky navigation bar", "hero section", "card grid", "CTA button", "tabbed interface", "data table", "modal overlay", "breadcrumb trail"
   - Visual language: suggest adjectives that define the feel — "clean and minimal", "bold and high-contrast", "warm and editorial", "dark and immersive"
   - Color direction: propose a palette mood — earth tones, monochrome, vibrant accent on neutral base, etc. Not hex codes yet, just direction
   - Typography feel: serif for editorial/luxury, sans-serif for modern/tech, playful rounded for consumer apps
   - Layout structure: name the sections — hero, features grid, testimonials, pricing table, CTA footer

3. STRUCTURE THE PROMPT using this formula:
   [What it is] + [Core sections with content] + [Visual theme adjectives] + [Color/typography direction] + [Key interaction notes if relevant]

4. KEEP IT ONE PARAGRAPH — dense, specific, and scannable. No bullet points, no headers. Just a rich paragraph prompt ready to paste.

5. LENGTH: 3–5 sentences max. Detailed but not overwhelming.

OUTPUT: Return ONLY the enhanced prompt. No preamble, no explanation, no quotes around it. Just the prompt itself.`,
        prompt: `Enhance this UI design prompt: "${prompt.trim()}"`,
    })

    return NextResponse.json({ enhanced: text.trim() })
}