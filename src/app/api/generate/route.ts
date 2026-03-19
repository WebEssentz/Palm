import { ConsumeCreditsQuery, CreditsBalanceQuery, InspirationImagesQuery, RefundCreditsQuery } from "@/convex/query.config"
import { NextRequest, NextResponse } from "next/server"
import { StyleGuideQuery } from "../../../convex/query.config"
import { generateText, streamText } from "ai"
import { google } from "@ai-sdk/google"
import { readFileSync } from "fs"
import { join } from "path"
import { prompts } from "@/prompts"
import sharp from "sharp"
import { compileToPalmIR, compileVisionToPalmIR } from '@/lib/palm-compiler'

const uiSkill = readFileSync(
    join(process.cwd(), 'skills/ui-generation/SKILL.md'), 'utf-8'
)
const layoutTokens = readFileSync(
    join(process.cwd(), 'skills/ui-generation/layout-tokens.md'), 'utf-8'
)

// ── Helpers ────────────────────────────────────────────────────

function extractJSON(text: string): any {
    try {
        return JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {}
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
        try { return JSON.parse(match[0]) } catch {}
    }
    return null
}

async function recursiveCrop(imageBuffer: ArrayBuffer): Promise<{
    full: Uint8Array
    crops: { label: string; image: Uint8Array }[]
}> {
    const full = new Uint8Array(imageBuffer)
    try {
        const img = sharp(Buffer.from(imageBuffer))
        const { width = 1440, height = 900 } = await img.metadata()
        const sections = [
            { label: 'nav-area', top: 0, left: 0, width, height: Math.floor(height * 0.12) },
            { label: 'main-content', top: Math.floor(height * 0.12), left: 0, width, height: Math.floor(height * 0.65) },
            { label: 'bottom-area', top: Math.floor(height * 0.75), left: 0, width, height: Math.floor(height * 0.25) },
        ]
        const crops = await Promise.all(
            sections.map(async (section) => {
                if (section.height < 20) return null
                const cropped = await sharp(Buffer.from(imageBuffer))
                    .extract({
                        left: section.left,
                        top: section.top,
                        width: Math.min(section.width, width),
                        height: Math.min(section.height, height - section.top)
                    })
                    .png()
                    .toBuffer()
                return { label: section.label, image: new Uint8Array(cropped) }
            })
        )
        return { full, crops: crops.filter(Boolean) as { label: string; image: Uint8Array }[] }
    } catch {
        return { full, crops: [] }
    }
}

// ── POST Handler ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const imageFile = formData.get('image') as File
        const projectId = formData.get('projectId') as string
        const shapesJson = formData.get('shapes') as string

        if (!imageFile || !projectId) {
            return NextResponse.json({ error: 'Missing image or project ID' }, { status: 400 })
        }

        if (!imageFile.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
        }

        const { ok: balanceOk, balance } = await CreditsBalanceQuery()
        if (!balanceOk) return NextResponse.json({ error: 'Failed to get balance' }, { status: 500 })
        if (balance === 0) return NextResponse.json({ error: 'No credits available' }, { status: 402 })

        const { ok } = await ConsumeCreditsQuery({ amount: 1 })
        if (!ok) return NextResponse.json({ error: 'Failed to consume credits' }, { status: 500 })

        const imageBuffer = await imageFile.arrayBuffer()
        const imageBytes = new Uint8Array(imageBuffer)

        const styleGuide = await StyleGuideQuery(projectId)
        const guide = styleGuide?.styleGuide?._valueJSON as any

        if (!guide) {
            return NextResponse.json({
                error: 'No style guide found. Generate a style guide first.'
            }, { status: 400 })
        }

        const inspirationImages = await InspirationImagesQuery(projectId)
        const images = (inspirationImages.images._valueJSON as unknown) as { url: string }[]
        const imageUrls = images
            .map(img => img.url)
            .filter((url): url is string => !!url && url.startsWith('https://'))

        const getColor = (name: string): string => {
            for (const section of guide.colorSections || []) {
                for (const swatch of section.swatches || []) {
                    if (swatch.name.toLowerCase() === name.toLowerCase()) return swatch.hexColor
                }
            }
            return '#cccccc'
        }

        const buildCssVars = (): string => [
            `--background: ${getColor('background')}`,
            `--foreground: ${getColor('foreground')}`,
            `--primary: ${getColor('primary')}`,
            `--primary-foreground: ${getColor('primaryForeground')}`,
            `--card: ${getColor('card')}`,
            `--card-foreground: ${getColor('cardForeground')}`,
            `--muted: ${getColor('muted')}`,
            `--muted-foreground: ${getColor('mutedForeground')}`,
            `--accent: ${getColor('accent')}`,
            `--border: ${getColor('border')}`,
            `--radius: 0.75rem`,
        ].join(';\n')

        const primaryFont = guide.typographySections?.[0]?.styles?.[0]?.fontFamily || 'Inter'

        // ── STEP 1: Structure ──────────────────────────────────────────
        const canvasShapes = shapesJson ? JSON.parse(shapesJson) : []
        const frameShape = canvasShapes.find((s: any) => s.type === 'frame') || { x: 0, y: 0, w: 1440, h: 900 }
        const shapesInsideFrame = canvasShapes.filter((s: any) => s.type !== 'frame')

        let structureSpec: string

        if (shapesInsideFrame.length > 0) {
            // ── GEOMETRY + DNA PATH ────────────────────────────────────
            const styleTokens = {
                colors: {
                    background: getColor('background'),
                    foreground: getColor('foreground'),
                    primary: getColor('primary'),
                    primaryForeground: getColor('primaryForeground'),
                    card: getColor('card'),
                    cardForeground: getColor('cardForeground'),
                    muted: getColor('muted'),
                    mutedForeground: getColor('mutedForeground'),
                    accent: getColor('accent'),
                    border: getColor('border'),
                },
                fonts: { sans: primaryFont },
                radius: '8px'
            }
            const palmIR = await compileToPalmIR(
                shapesInsideFrame,
                frameShape,
                Buffer.from(imageBuffer),
                styleTokens
            )
            structureSpec = JSON.stringify(palmIR, null, 2)

        } else {
            // ── VISION + DNA PATH ──────────────────────────────────────
            if (imageUrls.length === 0) {
                return NextResponse.json({
                    error: 'No inspiration images found. Add images to the Inspiration Board first.'
                }, { status: 400 })
            }

            const inspirationResponse = await fetch(imageUrls[0])
            const inspirationBuffer = Buffer.from(await inspirationResponse.arrayBuffer())
            const { full, crops } = await recursiveCrop(inspirationBuffer.buffer as ArrayBuffer)

            const structurePass = await generateText({
                model: google('gemini-3.1-flash-lite-preview'),
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'image', image: full },
                        ...crops.map(c => ({ type: 'image' as const, image: c.image })),
                        {
                            type: 'text',
                            text: `Return ONLY a JSON object. No explanations. No preamble. Start with { end with }.

{
  "source": "vision",
  "layout": "centered | sidebar | dashboard | landing",
  "contentContext": "specific e.g. 'AI chat interface with model selector and dark theme'",
  "visualStyle": "dark | light | minimal | bold",
  "components": [
    {
      "type": "nav | hero | input | cards | sidebar | footer | form",
      "position": "top | left | center | bottom | right",
      "alignment": "left | center | right",
      "children": [
        {
          "type": "button | text | input | image | icon | badge | link | avatar | selector",
          "content": "exact visible text",
          "style": "pill/rounded/square, filled/outlined/ghost, color",
          "position": "left | center | right | bottom-left | bottom-right"
        }
      ]
    }
  ]
}`
                        }
                    ]
                }],

                temperature: 0,
                providerOptions: {
                    google: {
                        thinkingConfig: {
                            thinkingLevel: 'medium',
                            includeThoughts: false,
                        }
                    }
                }
            })

            let layoutJson: any
            const extracted = extractJSON(structurePass.text)
            if (extracted) {
                layoutJson = extracted
            } else {
                console.warn('Vision pass returned prose, fallback used. Got:', structurePass.text.slice(0, 100))
                layoutJson = {
                    source: 'vision',
                    layout: 'centered',
                    contentContext: 'web interface',
                    visualStyle: 'light',
                    components: []
                }
            }

            const styleTokens = {
                colors: {},
                fonts: { sans: primaryFont },
                radius: '8px'
            }

            const palmIR = await compileVisionToPalmIR(
                layoutJson,
                inspirationBuffer,
                styleTokens
            )
            structureSpec = JSON.stringify(palmIR, null, 2)
        }

        const layoutJson = JSON.parse(structureSpec)

        // ── STEP 2: Generation ─────────────────────────────────────────
        const userPrompt = `
## PalmIR — COMPILED OUTPUT (DO NOT MODIFY STRUCTURE)
source: ${layoutJson.source}

This was produced by a deterministic geometry engine + visual DNA sampler.
Every layout relationship and color was mathematically extracted.
Your ONLY job: write HTML that implements this spec exactly.

${structureSpec}

## STYLE GUIDE (inject as CSS vars on root element)
${buildCssVars()}
Font: ${primaryFont}

## COMPONENT LIBRARY
${layoutTokens}

## RULES
- Structure comes from geometry engine — do not change it
- Colors come from visual DNA — use them exactly as given
- Layout relationships are mathematically correct — trust them
- Write the exact content described in each component
- This UI is: ${layoutJson.contentContext || layoutJson.visionContext?.contentContext || 'web interface'}
- Visual style: ${layoutJson.visualStyle || layoutJson.canvas?.theme || 'light'}
`

        const generatorImages = shapesInsideFrame.length > 0
            ? [{ type: 'image' as const, image: imageBytes }]
            : []

        const result = streamText({
            model: google('gemini-3.1-flash-lite-preview'),
            system: uiSkill,
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: userPrompt },
                    ...generatorImages,
                    ...imageUrls.map(url => ({ type: 'image' as const, image: url }))
                ]
            }],
            temperature: 0.7,
            providerOptions: {
                google: {
                    thinkingConfig: {
                        thinkingLevel: 'medium',
                        includeThoughts: false,
                    }
                }
            },
            onError: async ({ error }) => {
                console.error('Stream error, refunding:', error)
                await RefundCreditsQuery({ amount: 1 }).catch(console.error)
            },
            onFinish: ({ finishReason }) => {
                console.log('Generation finished:', finishReason)
            }
        })

        return result.toTextStreamResponse({
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache',
            }
        })

    } catch (error) {
        console.error('Generate UI error:', error)
        return NextResponse.json(
            { error: 'Failed to generate UI', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}