import { NextRequest } from 'next/server'
import { streamText, tool, stepCountIs } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import {
    generateUIStream,
    generateUIDiffStream,
    StyleTokens,
    inferStyleTokensFromPrompt,
    buildTokensFromGuide,
    UIDiff,
} from '@/lib/generate-ui'
import {
    CreditsBalanceQuery,
    ConsumeCreditsQuery,
    RefundCreditsQuery,
    StyleGuideQuery,
    SaveStyleGuideQuery,
} from '@/convex/query.config'
import { JSDOM } from 'jsdom'
import { extractVisualDNA } from '@/lib/visual-dna'
import { dnaToCSS } from '@/lib/dna-css'
import sharp from 'sharp'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type ChatStreamEvent =
    | { type: 'text'; text: string }
    | { type: 'html'; text: string }
    | { type: 'error'; text: string }
    | { type: 'styleguide'; tokens: StyleTokens }
    | { type: 'tool-status'; label: string; state: 'running' | 'done' }  // ← NEW
    | { type: 'done' }

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const encoder = new TextEncoder()

function encode(event: ChatStreamEvent): Uint8Array {
    return encoder.encode('data: ' + JSON.stringify(event) + '\n\n')
}

// Labels that cycle on the client while tool is running
const TOOL_LABELS = [
    'Analyzing the layout...',
    'Understanding the structure...',
    'Applying design tokens...',
    'Crafting the UI...',
    'Almost there...',
]

/**
 * Zero-latency keyword classifier — no extra LLM call.
 */
function classifyIntent(prompt: string, currentHTML?: string): 'surgical' | 'full' {
    if (!currentHTML) return 'full'

    const p = prompt.toLowerCase()

    const FULL_SIGNALS = [
        'redesign', 'redo', 'completely', 'new layout', 'start over',
        'different style', 'from scratch', 'rebuild', 'rethink', 'overhaul',
        'totally', 'rewrite', 'new version', 'fresh',
    ]

    const SURGICAL_SIGNALS = [
        'only', 'just', 'change the', 'make the', 'update the',
        'fix the', 'adjust', 'slightly', 'a bit', 'color', 'font',
        'size', 'spacing', 'padding', 'margin', 'border', 'shadow',
        'darker', 'lighter', 'bigger', 'smaller', 'bolder', 'opacity',
        'move', 'align', 'add a', 'remove the', 'rename', 'swap',
    ]

    if (FULL_SIGNALS.some(s => p.includes(s))) return 'full'
    if (SURGICAL_SIGNALS.some(s => p.includes(s))) return 'surgical'

    return 'full'
}

/**
 * Apply a UIDiff patch to existing HTML using JSDOM.
 */
function applyDiffPatch(html: string, diff: UIDiff): string {
    const dom = new JSDOM(html)
    const doc = dom.window.document

    if (diff.type === 'css-inject') {
        let styleTag = doc.querySelector('style')
        if (!styleTag) {
            styleTag = doc.createElement('style')
            doc.head.appendChild(styleTag)
        }
        const rules = diff.patches
            .filter(p => p.property)
            .map(p => `${p.selector} { ${p.property}: ${p.value}; }`)
            .join('\n')
        if (rules) {
            styleTag.textContent = (styleTag.textContent ?? '') + '\n' + rules
        }
    } else if (diff.type === 'block-replace') {
        for (const patch of diff.patches) {
            const el = doc.querySelector(patch.selector)
            if (!el) { console.warn(`Patch selector not found: ${patch.selector}`); continue }
            const temp = doc.createElement('div')
            temp.innerHTML = patch.value
            const replacement = temp.firstElementChild ?? temp.firstChild
            if (replacement) el.replaceWith(replacement)
        }
    }

    return dom.serialize()
}

/**
 * Stream HTML to the client in fixed-size chunks.
 */
function* chunkHTML(html: string, size = 500): Generator<Uint8Array> {
    for (let i = 0; i < html.length; i += size) {
        yield encode({ type: 'html', text: html.slice(i, i + size) })
    }
}

// ─────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
    const { prompt, projectId, history = [], currentHTML, frameSnapshot, imageStorageIds = [] } = await req.json()

    const { ok, balance } = await CreditsBalanceQuery()
    if (!ok || balance === 0) {
        return new Response(
            'data: ' + JSON.stringify({ type: 'error', text: 'No credits available.' }) + '\n\n',
            { status: 402, headers: { 'Content-Type': 'text/event-stream' } }
        )
    }

    let imageDNAContext = ''
    let referenceImageBytes: { type: 'image'; image: Uint8Array }[] = []

    if (imageStorageIds.length > 0) {
        try {
            const dnaSnippets = await Promise.all(
                imageStorageIds.map(async (storageId: string) => {
                    // Fetch image from Convex storage
                    const res = await fetch(`${process.env.CONVEX_SITE_URL}/api/storage/${storageId}`)
                    const arrayBuffer = await res.arrayBuffer()
                    const buffer = Buffer.from(arrayBuffer)
                    const { width = 1440, height = 900 } = await sharp(buffer).metadata()

                    // Full-image DNA — treat the whole image as one bounding box
                    const dna = await extractVisualDNA(
                        { id: storageId, x: 0, y: 0, w: width, h: height, centerX: width/2, centerY: height/2, right: width, bottom: height },
                        buffer,
                        width,
                        height
                    )
                    return dnaToCSS(dna)
                })
            )
            imageDNAContext = dnaSnippets
                .map((css, i) => `Reference image ${i + 1} visual style: ${css}`)
                .join('\n')
        } catch (e) {
            console.error('DNA extraction failed:', e)
        }

        // Fetch actual image bytes for Gemini to see
        try {
            referenceImageBytes = await Promise.all(
                imageStorageIds.map(async (storageId: string) => {
                    const res = await fetch(`${process.env.CONVEX_SITE_URL}/api/storage/${storageId}`)
                    const buffer = new Uint8Array(await res.arrayBuffer())
                    return { type: 'image' as const, image: buffer }
                })
            )
        } catch (e) {
            console.error('Failed to fetch reference images:', e)
        }
    }

    const editType = classifyIntent(prompt, currentHTML)
    console.log(`[route] Edit classified as: ${editType}`)

    // ── Status event channel ────────────────────────────────
    // Tool execute() pushes status labels into this controller.
    // It merges into the same response stream as text + HTML.
    let statusController: ReadableStreamDefaultController<Uint8Array> | null = null
    const statusStream = new ReadableStream<Uint8Array>({
        start(c) { statusController = c }
    })

    const pushStatus = (label: string, state: 'running' | 'done') => {
        try { statusController?.enqueue(encode({ type: 'tool-status', label, state })) } catch {}
    }

    // ── LLM call ────────────────────────────────────────────
    const result = streamText({
        model: google('gemini-3.1-flash-lite'),
system: `You are Palm by Rhinestone, a helpful UI design assistant.

CRITICAL: Before calling generateUI, you MUST always write 1-2 short sentences first. Never call a tool as your first action. Always narrate what you're about to do.

Good examples:
- "Sure! I'll update the button color while keeping everything else intact."
- "Got it, I'll give the hero section a fresh new look."
- "On it — redesigning the layout now."

If the user sends a greeting or question with no design intent, respond conversationally only. Do NOT call generateUI.

Only call generateUI when the user explicitly asks to create or modify a UI.
${currentHTML
    ? `A design frame is currently attached. Edit type: ${editType.toUpperCase()}.
${editType === 'surgical'
    ? 'SURGICAL edit — apply targeted patches only to what the user asked.'
    : 'FULL REGEN — regenerate the complete design with the requested changes.'
}`
    : ''}`,

        messages: [
            ...(currentHTML ? [
                {
                    role: 'user' as const,
                    content: [
                        ...(frameSnapshot ? [{ type: 'image' as const, image: frameSnapshot }] : []),
                        { type: 'text' as const, text: `Attached frame HTML:\n\`\`\`html\n${currentHTML.slice(0, 4000)}\n\`\`\`` },
                    ],
                },
                { role: 'assistant' as const, content: 'I can see the attached frame. What would you like to change?' },
            ] : []),
            ...history.flatMap((turn: { prompt: string; response: string }) => [
                { role: 'user' as const, content: turn.prompt },
                { role: 'assistant' as const, content: turn.response },
            ]),
            { 
                role: 'user' as const, 
                content: [
                    ...referenceImageBytes,
                    {
                        type: 'text' as const,
                        text: imageDNAContext 
                            ? `${prompt}\n\n[Reference image design analysis]\n${imageDNAContext}` 
                            : prompt
                    }
                ]
            },
        ],

        tools: {
            generateUI: tool({
                description: 'Generate or surgically edit an HTML UI. Only call this when the user wants to create or modify a design.',
                inputSchema: z.object({
                    designIntent: z.string().describe('2–3 sentence summary of what will change and why'),
                    prompt: z.string().describe('Full generation prompt enriched with design intent'),
                }),
                execute: async ({ prompt: uiPrompt }) => {
                    try {
                        pushStatus(TOOL_LABELS[0], 'running')

                        const consumeResult = await ConsumeCreditsQuery({ amount: 1 })
                        if (!consumeResult.ok) throw new Error('Failed to consume credits')

                        pushStatus(TOOL_LABELS[1], 'running')

                        const styleGuide = await StyleGuideQuery(projectId)
                        let styleTokens: StyleTokens
                        let styleGuideWasGenerated = false

                        if (!styleGuide?.styleGuide?._valueJSON) {
                            styleTokens = await inferStyleTokensFromPrompt(uiPrompt)
                            styleGuideWasGenerated = true
                            try { await SaveStyleGuideQuery(projectId, styleTokens) } catch (e) { console.error(e) }
                        } else {
                            styleTokens = buildTokensFromGuide(styleGuide.styleGuide._valueJSON)
                        }

                        let html = ''

                        if (editType === 'surgical' && currentHTML) {
                            pushStatus(TOOL_LABELS[2], 'running')

                            let diffJson = ''
                            for await (const chunk of generateUIDiffStream({ prompt: uiPrompt, projectId, currentHTML, styleTokens })) {
                                diffJson += chunk
                            }

                            pushStatus(TOOL_LABELS[3], 'running')
                            const cleaned = diffJson.replace(/```json|```/g, '').trim()
                            const diff = JSON.parse(cleaned) as UIDiff
                            html = applyDiffPatch(currentHTML, diff)
                            console.log(`[route] Surgical patch applied (${diff.patches.length} patches)`)

                        } else {
                            pushStatus(TOOL_LABELS[2], 'running')
                            for await (const chunk of generateUIStream({ prompt: uiPrompt, projectId, currentHTML, styleTokens })) {
                                html += chunk
                            }
                        }

                        pushStatus('Done', 'done')
                        return { success: true, html, styleTokens: styleGuideWasGenerated ? styleTokens : null }

                    } catch (err) {
                        // Surgical fallback → full regen
                        if (editType === 'surgical' && currentHTML) {
                            console.warn('[route] Surgical failed, falling back:', err)
                            pushStatus('Retrying...', 'running')
                            try {
                                const styleGuide = await StyleGuideQuery(projectId)
                                const styleTokens = styleGuide?.styleGuide?._valueJSON
                                    ? buildTokensFromGuide(styleGuide.styleGuide._valueJSON)
                                    : await inferStyleTokensFromPrompt(prompt)
                                let html = ''
                                for await (const chunk of generateUIStream({ prompt, projectId, currentHTML, styleTokens })) {
                                    html += chunk
                                }
                                pushStatus('Done', 'done')
                                return { success: true, html, styleTokens: null }
                            } catch (fallbackErr) {
                                await RefundCreditsQuery({ amount: 1 }).catch(() => {})
                                pushStatus('Failed', 'done')
                                return { success: false, error: fallbackErr instanceof Error ? fallbackErr.message : 'Fallback failed' }
                            }
                        }

                        await RefundCreditsQuery({ amount: 1 }).catch(() => {})
                        pushStatus('Failed', 'done')
                        return { success: false, error: err instanceof Error ? err.message : 'Failed' }
                    }
                },
            }),
        },

        stopWhen: stepCountIs(3),
    })

    // ── Merge LLM stream + status stream concurrently ───────
    const merged = new ReadableStream<Uint8Array>({
        async start(controller) {
            let llmDone = false
            let statusDone = false

            const statusReader = statusStream.getReader()
            const llmReader = result.fullStream.getReader()

            const enqueue = (v: Uint8Array) => { try { controller.enqueue(v) } catch {} }
            const tryClose = () => { if (llmDone && statusDone) { try { controller.close() } catch {} } }

            // Pump status events (pushed from tool execute)
            const pumpStatus = async () => {
                try {
                    while (true) {
                        const { done, value } = await statusReader.read()
                        if (done) break
                        enqueue(value)
                    }
                } finally {
                    statusDone = true
                    tryClose()
                }
            }

            // Pump LLM chunks — emits `done` BEFORE the finally block closes the controller
            const pumpLLM = async () => {
                try {
                    while (true) {
                        const { done, value: chunk } = await llmReader.read()
                        if (done) break

                        if (chunk.type === 'text-delta') {
                            enqueue(encode({ type: 'text', text: chunk.text }))
                        } else if (chunk.type === 'tool-result') {
                            const output = chunk.output as {
                                success: boolean
                                html?: string
                                error?: string
                                styleTokens?: StyleTokens | null
                            }
                            if (output.success && output.html) {
                                if (output.styleTokens) {
                                    enqueue(encode({ type: 'styleguide', tokens: output.styleTokens }))
                                }
                                for (const htmlChunk of chunkHTML(output.html)) {
                                    enqueue(htmlChunk)
                                }
                            } else if (!output.success && output.error) {
                                enqueue(encode({ type: 'error', text: output.error }))
                            }
                        }
                    }

                    // ✅ Emit `done` here — controller is still open, status stream still pumping
                    enqueue(encode({ type: 'done' }))

                } finally {
                    // Close status stream so pumpStatus can finish
                    try { statusController?.close() } catch {}
                    llmDone = true
                    tryClose()
                }
            }

            // ✅ Single call each — no more duplicate pumpLLM()
            await Promise.all([pumpStatus(), pumpLLM()])
        }
    })

    return new Response(merged, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
        },
    })
}