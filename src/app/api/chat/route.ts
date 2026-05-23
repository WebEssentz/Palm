import { NextRequest } from 'next/server'
import { streamText, tool, stepCountIs } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { generateUIStream, StyleTokens, inferStyleTokensFromPrompt, buildTokensFromGuide } from '@/lib/generate-ui'
import { CreditsBalanceQuery, ConsumeCreditsQuery, RefundCreditsQuery, StyleGuideQuery } from '@/convex/query.config'

// The event shape the client will parse
export type ChatStreamEvent =
    | { type: 'text'; text: string }
    | { type: 'html'; text: string }
    | { type: 'error'; text: string }
    | { type: 'styleguide'; tokens: StyleTokens }
    | { type: 'done' }

const encoder = new TextEncoder()

function encode(event: ChatStreamEvent): Uint8Array {
    return encoder.encode('data: ' + JSON.stringify(event) + '\n\n')
}

export async function POST(req: NextRequest) {
    const { prompt, projectId, currentHTML } = await req.json()

    const { ok, balance } = await CreditsBalanceQuery()
    if (!ok || balance === 0) {
        return new Response(
            'data: ' + JSON.stringify({ type: 'error', text: 'No credits available.' }) + '\n\n',
            { status: 402, headers: { 'Content-Type': 'text/event-stream' } }
        )
    }

    const result = streamText({
        model: google('gemini-3.5-flash'),
        system: `You are an expert UI designer and engineer. The user describes what they want built.

Your flow:
1. Respond with 1–2 sentences explaining your design approach and what you're about to create.
2. Call the generateUI tool to build it immediately.
3. Once the tool returns, write a structured handoff summary:
   - What was created and its aesthetic
   - 3–5 bullet points with **Bold Label:** describing real sections
   - Reference actual colors, copy, layout choices
   - End with one line offering specific refinements
Keep total response under 200 words. Use markdown.`,

        messages: [
            ...(currentHTML ? [
                { role: 'user' as const, content: `Current design:\n\`\`\`html\n${currentHTML.slice(0, 4000)}\n\`\`\`` },
                { role: 'assistant' as const, content: 'I can see your current design. What would you like to change?' },
            ] : []),
            { role: 'user' as const, content: prompt },
        ],

        tools: {
            generateUI: tool({
                description: 'Generate a complete HTML UI. Call this immediately after your opening.',
                inputSchema: z.object({
                    designIntent: z.string().describe('2–3 sentence summary of design direction'),
                    prompt: z.string().describe('Full generation prompt enriched with design intent'),
                }),
                execute: async ({ prompt: uiPrompt }) => {
                    try {
                        const consumeResult = await ConsumeCreditsQuery({ amount: 1 })
                        if (!consumeResult.ok) throw new Error('Failed to consume credits')

                        // Check if style guide exists, infer if not
                        const styleGuide = await StyleGuideQuery(projectId)
                        let styleTokens: StyleTokens
                        let styleGuideWasGenerated = false

                        if (!styleGuide?.styleGuide?._valueJSON) {
                            styleTokens = await inferStyleTokensFromPrompt(uiPrompt)
                            styleGuideWasGenerated = true
                        } else {
                            styleTokens = buildTokensFromGuide(styleGuide.styleGuide._valueJSON)
                        }

                        let html = ''
                        for await (const chunk of generateUIStream({ prompt: uiPrompt, projectId, currentHTML })) {
                            html += chunk
                        }

                        return {
                            success: true,
                            html,
                            styleTokens: styleGuideWasGenerated ? styleTokens : null,
                        }
                    } catch (err) {
                        await RefundCreditsQuery({ amount: 1 }).catch(() => {})
                        return { success: false, error: err instanceof Error ? err.message : 'Failed' }
                    }
                },
            }),
        },

        stopWhen: stepCountIs(3),
    })

    // Transform fullStream into our simple SSE format
    const transformStream = new TransformStream({
        async transform(chunk, controller) {
            switch (chunk.type) {
                case 'text-delta':
                    controller.enqueue(encode({ type: 'text', text: chunk.text }))
                    break
                case 'tool-result': {
                    // The tool already ran — emit the HTML now
                    const output = chunk.output as {
                        success: boolean
                        html?: string
                        error?: string
                        styleTokens?: StyleTokens | null
                    }

                    if (output.success && output.html) {
                        // Emit style guide frame first if tokens were generated
                        if (output.styleTokens) {
                            controller.enqueue(encode({ type: 'styleguide', tokens: output.styleTokens }))
                        }

                        // Then stream HTML in chunks
                        const chunkSize = 500
                        for (let i = 0; i < output.html.length; i += chunkSize) {
                            controller.enqueue(
                                encode({ type: 'html', text: output.html.slice(i, i + chunkSize) })
                            )
                        }
                    } else if (!output.success && output.error) {
                        controller.enqueue(encode({ type: 'error', text: output.error }))
                    }
                    break
                }
            }
        },
        flush(controller) {
            controller.enqueue(encode({ type: 'done' }))
        }
    })

    return new Response(result.fullStream.pipeThrough(transformStream), {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
        },
    })
}