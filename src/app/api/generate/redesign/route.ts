import { NextResponse, NextRequest } from "next/server";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { prompts } from "@/prompts";
import {
    ConsumeCreditsQuery,
    CreditsBalanceQuery, 
    StyleGuideQuery,
    InspirationImagesQuery,
    RefundCreditsQuery,
} from "@/convex/query.config"

export async function POST(req: NextRequest) {
    let creditsConsumed = false
    try {
        const body = await req.json()
        const {
            userMessage,
            generatedUIId,
            currentHTML,
            projectId,
            wireframeSnapshot
        } = body

        if (!userMessage || !generatedUIId || !projectId) {
            return NextResponse.json(
                {
                    error: 'Missing required fields: userMessage, generatedUIId, currentHTML, projectId'
                },
                { status: 400 }
            )
        }

        const { ok: balanceOk, balance: balanceBalance } = await CreditsBalanceQuery()
        if (!balanceOk || balanceBalance === 0) {
            return NextResponse.json(
                {
                    error: 'Insufficient credits'
                },
                { status: 400 }
            )
        }

        const { ok } = await ConsumeCreditsQuery({ amount: 1 })
        if (!ok) {
            return NextResponse.json(
                {
                    error: 'Failed to consume credits'
                },
                { status: 500 }
            )
        }
        creditsConsumed = true

        const styleGuide = await StyleGuideQuery(projectId)
        const styleGuideData = styleGuide.styleGuide._valueJSON as unknown as {
            colorSections: unknown[]
            typographySections: unknown[]
        }

        const inspirationResult = await InspirationImagesQuery(projectId)
        const images = inspirationResult.images._valueJSON as unknown as {
            url: string
        }[]
        const imageUrls = images.map((img) => img.url).filter(Boolean)

        const colors = styleGuideData?.colorSections || []
        const typography = styleGuideData?.typographySections || []

        let userPrompt = `Please redesign this UI based on my request: "${userMessage}"`
        
        if (currentHTML) {
            userPrompt += `
                \n\nCurrent HTML for reference:\n${currentHTML.substring(0, 1000)}....
             `
        }

        if (wireframeSnapshot) {
            userPrompt += `
                \n\nWireframe Context: I'm providing a wireframe image that shows the EXACT original design layout and structure that this UI was generated from. This wireframe represents the specific frame that was used to create the current design. Please use this as a visual context to understand the intended layout, structure, and design elements when making improvements. The wireframe shows the original wireframe/mockup that the user drew or created.
            `
            console.log(wireframeSnapshot, 'wireframeSnapshot')
        } else {
            console.log('No wireframe snapshot provided')
        }

        if (colors.length > 0) {
            userPrompt += `
                \n\nStyle Guide Colors:\n${(
                    colors as Array<{
                        swatches: Array<{
                            name: string
                            hexColor: string
                            description: string
                        }>
                    }>  
                ).map((color) =>
                    color.swatches
                        .map(
                            (swatch) =>
                                `${swatch.name}: ${swatch.hexColor}, ${swatch.description}`
                        )
                        .join(', ')
                )
                .join(', ')
            }
            `
        }

        if (typography.length > 0) {
            userPrompt += `
                \n\nStyle Guide Typography:
                ${(
                    typography as Array<{
                        fonts: Array<{
                            name: string
                            fontFamily: string
                            description: string
                            fontWeight: string
                            fontSize: string
                            lineHeight: string
                        }>
                    }>  
                ).map((typography) =>
                    typography.fonts
                        .map(
                            (font) =>
                                `${font.name}: ${font.fontFamily}, ${font.description}, ${font.fontWeight}, ${font.fontSize} ${font.lineHeight}`
                        )
                        .join(', ')
                )
                .join(', ')
            }
            `
        }

        if (imageUrls.length > 0) {
            userPrompt += `\n\nInspiration Images Available: ${imageUrls.length} reference images for visual style and inspiration.`
        }

        userPrompt += `
            \n\nPlease generate a completely new HTML design based on my request while following the style guide, maintaining professional quality and considering the wireframe context for layout understanding
        `

        const result = streamText({
            model: google('gemini-3.1-flash-lite-preview'),
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: userPrompt,
                        },
                        {
                            type: 'image',
                            image: wireframeSnapshot,
                        },
                        ...imageUrls.map((url) => ({
                            type: 'image' as const,
                            image: url,
                        })),
                    ],
                },
            ],
            system: prompts.generativeUi.system,
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
                console.error('Redesign stream error, refunding:', error)
                await RefundCreditsQuery({ amount: 1 }).catch(console.error)
            },
        })

        return result.toTextStreamResponse({
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive'
            }
        })
    } catch (error) {
        console.error("Redesign API error: ", error)
        if (creditsConsumed) {
            console.error('Refunding credits...')
            await RefundCreditsQuery({ amount: 1 }).catch(console.error)
        }
        return NextResponse.json(
            {
                error: 'Failed to generate redesign',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}