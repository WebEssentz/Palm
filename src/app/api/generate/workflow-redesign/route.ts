import { google } from "@ai-sdk/google"
import { streamText } from "ai"
import { prompts } from "@/prompts"
import {
    ConsumeCreditsQuery,
    CreditsBalanceQuery,
    StyleGuideQuery,
    RefundCreditsQuery,
} from "@/convex/query.config"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    let creditsConsumed = false
    try {
        const body = await req.json()
        const { userMessage, generatedUIId, currentHTML, projectId } = body

        if (!userMessage || !generatedUIId || !currentHTML || !projectId) {
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

        const { ok } = await ConsumeCreditsQuery({ amount: 4 })
        if (!ok) {
            return NextResponse.json(
                {
                    error: 'Failed to consume credits'
                },
                { status: 500 }
            )
        }
        creditsConsumed = true

        console.log(currentHTML, 'currentHTML')

        const styleGuide = await StyleGuideQuery(projectId)
        const styleGuideData = styleGuide.styleGuide._valueJSON as unknown as {
            colorSections: unknown[]
            typographySections: unknown[]
        }

        let userPrompt = `CRITICAL: You are redesigning a SPECIFIC WORKFLOW PAGE, not creating a new page from scratch
        USER REQUEST: "${userMessage}"

        CURRENT WORKFLOW PAGE TO REDESIGN:
        ${currentHTML}

        WORKFLOW REDESIGN REQUIREMENTS:
        1. MODIFY THE PROVIDED HTML ABOVE - do not create a completely new page
        2. Apply the user's requested changes to the existing workflow page design
        3. Keep the same page type and the core functionality (Dashboard, Settings, Profile, or Listing)
        4. Maintain the existing layout structure and component hierarchy
        5. Preserve all functional elements while applying visual/content changes.
        6. Keep the same general organization and workflow purpose.

        MODIFICATION GUIDELINES: 
        1. Start with the provided HTML structure as your base
        2. Apply the user's requested changes to the existing workflow page design
        3. Keep all exiting IDs and semantic structure intact.
        4. Maintain shadcn/ui component patterns and classes.
        5. Preserve responsive design and accesibility features.
        6. Update content, styling or layout as requested but keep the core structure

        IMPORTANT:
        - DO NOT GENERATE A COMPLETELY NEW PAGE
        - DO NOT REVERT TO ANY "ORIGINAL" OR "MAIN" PAGE DESIGN
        - DO REDESIGN THE SPECIFIC WORKFLOW PAGE SHOWN IN THE HTML ABOVE.
        - DO APPLY THE USER'S CHANGES TO THAT SPECIFIC PAGE.

        colors: ${styleGuideData.colorSections
            .map((color: any) =>
                color.swatches
                    .map((swatch: any) => {
                        return `${swatch.name}: ${swatch.hexColor}, ${swatch.description}`
                    })
                    .join(', ')
            )
            .join(', ')
        }

        typography: ${styleGuideData.typographySections
            .map((typography: any) =>
                typography.fonts
                    .map((font: any) => {
                        return `${font.name}: ${font.fontFamily}, ${font.description}, ${font.fontWeight}, ${font.fontSize} ${font.lineHeight}`
                    })
                    .join(', ')
            )
            .join(', ')
        }

        Please generate the modified version of the provided workflow page HTML with the requested changes applied.
        `

        userPrompt += `
          \n\nPlease generate a professional redesign workflow page that incorporates the requested changes while maintaining the core functionality and design consistency
        `

        const result = streamText({
            model: google('gemini-3.1-flash-lite-preview'),
            system: prompts.generativeUi.system,
            messages: [
                { 
                    role: 'user', 
                    content: [
                       {
                         type: 'text',
                         text: userPrompt
                       },
                    ],
                },
            ],
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
                console.error('Workflow redesign stream error, refunding:', error)
                await RefundCreditsQuery({ amount: 4 }).catch(console.error)
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
        console.error('Workflow redesign API error: ', error)
        if (creditsConsumed) {
            console.error('Refunding credits...')
            await RefundCreditsQuery({ amount: 4 }).catch(console.error)
        }
        return NextResponse.json(
            {
                error: 'Failed to generate workflow redesign',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}