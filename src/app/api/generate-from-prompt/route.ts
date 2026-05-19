import { NextRequest, NextResponse } from 'next/server'
import { google } from '@ai-sdk/google'
import { streamText, generateText } from 'ai'
import { ConsumeCreditsQuery, CreditsBalanceQuery, RefundCreditsQuery } from '@/convex/query.config'
import { readFileSync } from 'fs'
import { join } from 'path'

const uiSkill = readFileSync(
    join(process.cwd(), 'skills/ui-generation/SKILL.md'), 'utf-8'
)
const layoutTokens = readFileSync(
    join(process.cwd(), 'skills/ui-generation/layout-tokens.md'), 'utf-8'
)

export async function POST(req: NextRequest) {
    try {
        const { prompt, projectId } = await req.json()

        if (!prompt || !projectId) {
            return NextResponse.json({ error: 'Missing prompt or projectId' }, { status: 400 })
        }

        // Credits check
        const { ok: balanceOk, balance } = await CreditsBalanceQuery()
        if (!balanceOk) return NextResponse.json({ error: 'Failed to get balance' }, { status: 500 })
        if (balance === 0) return NextResponse.json({ error: 'No credits' }, { status: 402 })

        const consumeResult = await ConsumeCreditsQuery({ amount: 1 })
        if (!consumeResult.ok) return NextResponse.json({ error: 'Failed to consume credits' }, { status: 500 })

        const newBalance = consumeResult.balance

        // ── STEP A: Planning pass ──────────────────────────────────────
        // This is where AI "thinks out loud" before generating
        // Later: stream this text to a chat panel in the UI
        const { text: planningThought } = await generateText({
            model: google('gemini-3.1-flash-lite-preview'),
            prompt: `You are a UI designer. A user wants: "${prompt}"
            
In 2-3 sentences, describe what you're about to design — layout, key components, visual style.
Be specific and confident. This will show to the user while their design generates.
Return ONLY the description, no preamble.`,
            providerOptions: {
                google: {
                    thinkingConfig: {
                        thinkingLevel: 'medium',
                        includeThoughts: false,
                    }
                }
            }
        })

        // TODO: send planningThought to client via a separate SSE channel or 
        // return it as a header/first chunk so the UI can display it
        // For now it's generated but not yet surfaced to the user
        // ── END PLANNING PASS ─────────────────────────────────────────

        // ── STEP B: Layout inference ───────────────────────────────────
        const layoutSpec = {
            source: 'prompt',
            layout: 'landing',
            contentContext: prompt,
            visualStyle: 'modern',
            components: []
        }
        // ── END LAYOUT INFERENCE ──────────────────────────────────────

        const systemPrompt = `${uiSkill}

You are generating a UI from a text prompt only — no reference image.
Infer layout, spacing, and visual hierarchy from the prompt description.
Use modern design patterns appropriate to the described interface.`

        const userPrompt = `
## USER PROMPT
"${prompt}"

## WHAT TO BUILD
${planningThought}

## COMPONENT LIBRARY
${layoutTokens}

## RULES
- Generate a complete, production-quality HTML page
- Use Tailwind CSS via CDN
- Infer a color palette appropriate to the product described
- No placeholder images — use solid color blocks or SVG icons
- Output ONLY the HTML, no explanation
`
        // ── STEP C: Generation stream ──────────────────────────────────
        // This streams the HTML tokens back to the canvas
        // Each chunk updates the iframe in real time
        const result = streamText({
            model: google('gemini-3.1-flash-lite-preview'),
            system: systemPrompt,
            messages: [{
                role: 'user',
                content: [{ type: 'text', text: userPrompt }]
            }],
            temperature: 0.7,
            providerOptions: {
                google: {
                    thinkingConfig: {
                        thinkingLevel: 'high',
                        includeThoughts: false,
                    }
                }
            },
            onError: async ({ error }) => {
                console.error('Stream error, refunding:', error)
                await RefundCreditsQuery({ amount: 1 }).catch(console.error)
            },
            onFinish: ({ finishReason }) => {
                console.log('Prompt generation finished:', finishReason)
            }
        })
        // ── END GENERATION STREAM ─────────────────────────────────────

        // TODO: before returning the stream, send planningThought as a 
        // custom response header so canvas can show it immediately:
        // headers: { 'X-Palm-Thought': encodeURIComponent(planningThought) }

        return result.toTextStreamResponse({
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache',
                'X-New-Balance': String(newBalance),
                // Uncomment when you build the AI thought panel:
                // 'X-Palm-Thought': encodeURIComponent(planningThought),
            }
        })

    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to generate UI' },
            { status: 500 }
        )
    }
}
