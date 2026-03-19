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
        const { generatedUIId, currentHTML, projectId, pageIndex } = body

        if (
            !generatedUIId ||
            !currentHTML ||
            !projectId ||
            pageIndex === undefined
        ) {
            return NextResponse.json({
                error: "Missing required fields"
            }, { status: 400 })
        }

        const { ok: balanceOk, balance: balanceBalance } = await CreditsBalanceQuery()

        if (!balanceOk || balanceBalance === 0) {
            return NextResponse.json({
                error: "Insufficient credits"
            }, { status: 400 })
        }

        const { ok } = await ConsumeCreditsQuery({ amount: 1 })
        if (!ok) {
            return NextResponse.json({
                error: "Failed to consume credits"
            }, { status: 500 })
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
        const imageURLs = images.map((img) => img.url).filter(Boolean)

        const colors = styleGuideData?.colorSections || []
        const typography = styleGuideData?.typographySections || []

        const pageTypes = [
            'Dashboard/Analytics page with charts, metrics, and KPIs',
            'E-commerce product listing page with filters, sorting, and product cards',
            'Blog/Article page with header, content, sidebar, and comments section',
            'Portfolio page with hero section, projects grid, and contact form',
            'Login/Authentication page with form, social login, and password reset',
            'Settings/Profile page with user information, preferences, and notifications',
            'Checkout/Payment page with cart summary, payment options, and order confirmation',
            'Landing page with hero section, features, testimonials, and CTA',
            'Pricing/Subscription page with plans, comparison table, and FAQ',
            'Contact page with form, map, and contact information'
        ]

        const selectedPageType = pageTypes[pageIndex] || pageTypes[0]

        let userPrompt = `You are tasked with creating a workflow page that complements the provided main page design.
        MAIN PAGE REFERENCE (for design consistency):
        ${currentHTML.substring(0, 2000)}....

        WORKFLOW PAGE TO GENERATE:
        Create a "${selectedPageType}" that would logically complement the main page shown above.

        DYNAMIC PAGE REQUIREMENTS:
        1. Analyze the main page design an determine what type of application it appears to be
        2. Based on that analysis, create a fitting ${selectedPageType} that would make sense n this application context
        3. The page should feel like a natural extension of the main page's functionality
        4. Use your best judgment to determine appropriate content, features and layout for this page type.

        DESIGN CONSISTENCY REQUIREMENTS:
        1. Use the EXACT same visual style, color scheme, and typography as the main page.
        2. Maintain identical component styling (buttons, cards, forms, navigation, etc.
        3. Keep the same overall layout structure and spacing system
        4. Ensure the workflow page feels like a natural extension of the main page's functionality
        5. Do NOT create a completely different design system - it must match the main page exactly

        TECHNICAL REQUIREMENTS:
        1. Generate clean, semantic HTML with Tailwind CSS classes matching the main page
        2. Use similar shadcn/ui component patterns as shown in the main page
        3. Include responsive design considerations
        4. Add proper assesiblity attributes (aria-labels, semantic HTML)
        5. Create a functional, production-ready page layout
        6. Include realistic content and data that fits the page type and application context

        CONTENT GUILDELINES:
        1. Generate realistic, contextually appropriate content (don't use LOREM IPSUM)
        2. Create functional UI elements appropriate for the page type
        3. Include proper navigation elements if they exist in the main page
        4. Maintain the same level of detail and complexity as the main page
        5. Add interactive elements like buttons, forms, tables, etc. As appropriate for the page type.

        Please generate a complete, professional HTML page that serves as a ${selectedPageType} while maintaining perfect visual and functional consistency with the main design`

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
                                `${swatch.name}: ${swatch.hexColor} - ${swatch.description}`
                        ).join(', ')
                ).join(', ')}
            `
        }

        if (typography.length > 0) {
            userPrompt += `
                \n\nStyle Guide Typography:\n${(
                    typography as Array<{
                        styles: Array<{
                            name: string
                            description: string
                            fontFamily: string
                            fontWeight: string
                            fontSize: string
                            lineHeight: string
                        }>
                    }>
                ).map((typography) =>
                    typography.styles
                        .map(
                            (style) =>
                                `${style.name}: ${style.fontFamily} - ${style.fontWeight} - ${style.fontSize} - ${style.lineHeight}`
                        ).join(', ')
                ).join(', ')}
            `
        }

        if (imageURLs.length > 0) {
            userPrompt += `
                \n\nInspiration Images:\n${imageURLs.length} images provided, reference for visual styles and inspiration.
            `
        }

        userPrompt += `
            \n\nIMPORTANT:
            Please generate a professional ${selectedPageType} that maintains complete desing consistency with the main page while serving its specific functional purpose. Be creative and contexually consistent.            
        `
        const result = streamText({
            model: google('gemini-3.1-flash-lite-preview'),
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: userPrompt
                        },
                        ...imageURLs.map((url) => ({
                            type: 'image' as const,
                            image: url
                        })),
                    ]
                }
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
                console.error('Workflow stream error, refunding:', error)
                await RefundCreditsQuery({ amount: 1 }).catch(console.error)
            },
        })

        return result.toTextStreamResponse({
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive'
            },
        })
    } catch (error) {
        console.error('Workflow generation API error', error)
        return NextResponse.json(
            {
                error: 'Failed to process workflow generation request',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}