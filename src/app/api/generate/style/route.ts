import { ConsumeCreditsQuery, CreditsBalanceQuery, MoodBoardImagesQuery } from "@/convex/query.config";
import { MoodBoardImage } from "@/hooks/use-styles";
import { prompts } from "@/prompts";
import { NextRequest, NextResponse } from "next/server";
import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import { fetchMutation } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const ColorSwatchSchema = z.object({
    name: z.string(),
    hexColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be valid hex color"),
    description: z.string().optional()
})

const SecondaryColorsSchema = z.object({
    title: z.literal('Secondary & Accent Colors'),
    swatches: z.array(ColorSwatchSchema).min(1)
})

const UIComponentColorsSchema = z.object({
    title: z.literal('UI Component Colors'),
    swatches: z.array(ColorSwatchSchema).min(1)
})

const UtilityColorsSchema = z.object({
    title: z.literal('Utility & Form Colors'),
    swatches: z.array(ColorSwatchSchema).min(1)
})

const StatusColorsSchema = z.object({
    title: z.literal('Status & Feedback Colors'),
    swatches: z.array(ColorSwatchSchema).min(1)
})

const PrimaryColorsSchema = z.object({
    title: z.literal('Primary Colors'),
    swatches: z.array(ColorSwatchSchema).min(1)
})

const TypographyStyleSchema = z.object({
    name: z.string(),
    fontFamily: z.string(),
    fontWeight: z.string(),
    fontSize: z.string(),
    lineHeight: z.string(),
    letterSpacing: z.string().optional(),
    description: z.string().optional()
})

const TypographySectionSchema = z.object({
    title: z.string(),
    styles: z.array(TypographyStyleSchema)
})

const ColorSectionSchema = z.union([
    PrimaryColorsSchema,
    SecondaryColorsSchema,
    UIComponentColorsSchema,
    UtilityColorsSchema,
    StatusColorsSchema
])

const StyleGuideSchema = z.object({
    theme: z.string(),
    description: z.string(),
    colorSections: z.array(ColorSectionSchema).min(3).max(5),
    typographySections: z.array(TypographySectionSchema).min(1).max(3)
})


export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { projectId } = body

        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            )
        }

        const { ok: balanceOk, balance: balanceRemaining } = await CreditsBalanceQuery()

        if (!balanceOk) {
            return NextResponse.json(
                { error: 'Failed to check balance' },
                { status: 500 }
            )
        }

        if (balanceRemaining === 0) {
            return NextResponse.json(
                { error: 'Insufficient credits' },
                { status: 400 }
            )
        }

        const moodBoardImages = await MoodBoardImagesQuery(projectId)

        if (!moodBoardImages || moodBoardImages.images._valueJSON.length === 0) {
            return NextResponse.json(
                {
                    error:
                        'No moodboard images found. Please add moodboard images'
                },
                { status: 400 }
            )
        }

        const images = moodBoardImages.images._valueJSON as unknown as MoodBoardImage[]
        const imageUrls = images
            .map((img) => img.url)
            .filter((url): url is string => {
                if (!url) return false
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    console.warn('[generate-style] Skipping non-HTTP image URL:', url.slice(0, 50))
                    return false
                }
                return true
            })
        const systemPrompt = prompts.styleGuide.system

        const userPrompt = `Analyze these ${imageUrls.length} mood board images and generate a design system: Extract colors that work harmoniously together, create a color palette, and typography that matches the aesthetic. Return ONLY the JSON object matching the exact schema structure above.`

        const result = await generateObject({
            model: google('gemini-3.1-flash-lite-preview'),  // best price/quality
            schema: StyleGuideSchema,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: userPrompt,
                        },
                        ...imageUrls.map((url) => ({
                            type: 'image' as const,
                            image: new URL(url as string),  // ← URL object for remote images
                        })),
                    ],
                },
            ],
        })

        const { ok, balance } = await ConsumeCreditsQuery({ amount: 1 })

        if (!ok) {
            return NextResponse.json(
                { error: 'Failed to consume credits' },
                { status: 500 }
            )
        }

        await fetchMutation(
            api.projects.updateProjectStyleGuide,
            { projectId: projectId as Id<'projects'>, styleGuide: result.object },
            { token: await convexAuthNextjsToken() }
        )

        return NextResponse.json({
            success: true,
            balance,
            message: 'Style guide generated successfully',
            styleGuide: result.object
        })
    } catch (error) {
        console.error('Style guide generation error:', error)
        return NextResponse.json(
            { error: 'Failed to generate style guide', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}