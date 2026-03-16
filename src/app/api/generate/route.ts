import { ConsumeCreditsQuery, CreditsBalanceQuery, InspirationImagesQuery, RefundCreditsQuery } from "@/convex/query.config"
import { NextRequest, NextResponse } from "next/server"
import { StyleGuideQuery } from "../../../convex/query.config"
import { generateText, streamText } from "ai"
import { google } from "@ai-sdk/google"
import { readFileSync } from "fs"
import { join } from "path"
import sharp from "sharp"

const uiSkill = readFileSync(
    join(process.cwd(), 'skills/ui-generation/SKILL.md'), 'utf-8'
)
const layoutTokens = readFileSync(
    join(process.cwd(), 'skills/ui-generation/layout-tokens.md'), 'utf-8'
)

// ── Recursive Crop ─────────────────────────────────────────────
// Finds bounding boxes of main sections in the image
// then crops each one and sends to vision separately
// so the model sees fine detail it misses at full scale
async function recursiveCrop(imageBuffer: ArrayBuffer): Promise<{
    full: Uint8Array
    crops: { label: string; image: Uint8Array }[]
}> {
    const full = new Uint8Array(imageBuffer)

    try {
        const img = sharp(Buffer.from(imageBuffer))
        const { width = 1440, height = 900 } = await img.metadata()

        // Divide image into logical sections based on common UI zones
        // Top 10% = nav, middle 60% = main content, bottom 30% = footer/input
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

        return {
            full,
            crops: crops.filter(Boolean) as { label: string; image: Uint8Array }[]
        }
    } catch {
        return { full, crops: [] }
    }
}

// ── Semantic Parser (for Redux shapes) ────────────────────────
function parseShapesToSemanticJSON(shapes: any[], frame: any) {
    if (!shapes.length) return null

    const normalized = shapes.map(s => ({
        ...s,
        x: s.x - frame.x,
        y: s.y - frame.y,
    })).sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x)

    const groups: any[][] = []
    const used = new Set<string>()

    for (const shape of normalized) {
        if (used.has(shape.id)) continue
        const row = normalized.filter(s =>
            !used.has(s.id) && Math.abs(s.y - shape.y) < 20
        )
        row.forEach(s => used.add(s.id))
        groups.push(row.sort((a, b) => a.x - b.x))
    }

    return {
        source: 'canvas',
        canvas: { w: frame.w, h: frame.h },
        layout: groups.length > 0 && groups[0].some(s => s.w > frame.w * 0.8) ? 'landing' : 'centered',
        components: groups.map(group => {
            if (group.length === 1) {
                const s = group[0]
                return {
                    type: s.label || inferType(s, frame),
                    role: inferRole(s.label || inferType(s, frame)),
                    size: { w: s.w, h: s.h },
                    position: { x: s.x, y: s.y },
                    text: s.type === 'text' ? s.content : undefined,
                }
            }
            return {
                type: 'flex-row',
                direction: 'horizontal',
                children: group.map(s => ({
                    type: s.label || inferType(s, frame),
                    size: { w: s.w, h: s.h },
                    text: s.type === 'text' ? s.content : undefined,
                }))
            }
        })
    }
}

function inferType(s: any, frame: any): string {
    if (s.y < 80 && s.w > frame.w * 0.6) return 'nav'
    if (s.h > frame.h * 0.3 && s.w > frame.w * 0.6) return 'hero'
    if (s.h < 50 && s.w > 300) return 'input'
    if (s.h < 50 && s.w < 200) return 'button'
    if (s.w < frame.w * 0.25) return 'sidebar'
    return 'card'
}

function inferRole(type: string): string {
    const roles: Record<string, string> = {
        nav: 'navigation', button: 'button', input: 'textbox',
        hero: 'banner', sidebar: 'complementary', card: 'article', footer: 'contentinfo',
    }
    return roles[type] || 'region'
}

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
        const frameShape = canvasShapes.find((s: any) => s.type === 'frame') || 
            { x: 0, y: 0, w: 1440, h: 900 }
        const shapesInsideFrame = canvasShapes.filter((s: any) => s.type !== 'frame')

        let structureSpec: string

        if (shapesInsideFrame.length > 0) {
                        // Canvas has shapes → use Redux as source of truth
                        const semanticJSON = parseShapesToSemanticJSON(shapesInsideFrame, frameShape)
                        structureSpec = JSON.stringify(semanticJSON, null, 2)
                } else {
                        // Empty frame → use inspiration image for structure extraction
                        if (imageUrls.length === 0) {
                                return NextResponse.json({
                                        error: 'No inspiration images found. Add images to the Inspiration Board first.'
                                }, { status: 400 })
                        }

                        // Recursive crop on the FIRST inspiration image
                        const firstInspirationUrl = imageUrls[0]
                        const inspirationResponse = await fetch(firstInspirationUrl)
                        const inspirationBuffer = await inspirationResponse.arrayBuffer()
                        const { full, crops } = await recursiveCrop(inspirationBuffer)

                        const structurePass = await generateText({
                                model: google('gemini-3.1-flash-lite-preview'),
                                messages: [{
                                        role: 'user',
                                        content: [
                                                { type: 'image', image: full },
                                                ...crops.map(c => ({ type: 'image' as const, image: c.image })),
                                                {
                                                        type: 'text',
                                                        text: `You are a UI analyst. I am sending you:
1. The full UI screenshot
2. Cropped sections of the same UI (nav area, main content, bottom area)

Use the CROPS to extract fine details (small buttons, badges, exact text, icons).
Use the FULL image for overall layout structure.

Return ONLY JSON. No prose. No fences.

{
    "source": "vision",
    "layout": "centered | sidebar | dashboard | landing",
    "contentContext": "specific description e.g. 'AI chat interface with model selector and dark theme'",
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
                    "style": "describe: pill/rounded/square, filled/outlined/ghost, color",
                    "position": "left | center | right | bottom-left | bottom-right"
                }
            ]
        }
    ]
}`
                                                }
                                        ]
                                }]
                        })

                        try {
                                structureSpec = structurePass.text.replace(/```json|```/g, '').trim()
                                JSON.parse(structureSpec) // validate
                        } catch {
                                structureSpec = JSON.stringify({
                                        source: 'vision',
                                        layout: 'centered',
                                        contentContext: 'web interface',
                                        components: []
                                })
                        }
                }

        const layoutJson = JSON.parse(structureSpec)

        // ── STEP 2: Generation ─────────────────────────────────────────
        // LLM gets: JSON (structure) + image (visuals) + style guide (colors)
        const userPrompt = `
## STRUCTURE MAP — follow this exactly
${structureSpec}

## YOUR TWO INPUTS
1. JSON above → tells you WHAT exists and WHERE (do not deviate)
2. Images attached → tells you HOW each element looks

## RULES
- Use JSON for ALL layout/structure decisions
- Use images ONLY for CSS visual decisions: colors, radius, shadows, fonts, spacing
- Generate exact copy from the image — read every text label
- Do NOT add components not in the JSON
- Do NOT change positions defined in the JSON

## STYLE GUIDE (inject as CSS vars on root element)
${buildCssVars()}
Font: ${primaryFont}

## COMPONENT LIBRARY
${layoutTokens}

This UI is: ${layoutJson.contentContext || 'web interface'}
Visual style: ${layoutJson.visualStyle || 'minimal'}

Build it. Production quality. The JSON is the blueprint. The image is the style reference.
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
            temperature: 0.3,
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