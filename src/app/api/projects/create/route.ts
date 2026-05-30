import { NextRequest, NextResponse } from 'next/server'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { fetchMutation } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '../../../../../convex/_generated/api'
import { extractVisualDNA } from '@/lib/visual-dna'
import { dnaToCSS } from '@/lib/dna-css'
import sharp from 'sharp'

const generateGradientThumbnail = () => {
    const gradients = [
        ["#667eea", "#764ba2"],
        ["#f093fb", "#f5576c"],
        ["#4facfe", "#00f2fe"],
        ["#43e97b", "#38f9d7"],
        ["#fa709a", "#fee140"],
        ["#a8edea", "#fed6e3"],
        ["#ff9a9e", "#fecfef"],
        ["#ffecd2", "#fcb69f"],
    ]
    const [c1, c2] = gradients[Math.floor(Math.random() * gradients.length)]
    return `linear-gradient(135deg, ${c1}, ${c2})`
}

async function extractDNAFromStorageIds(imageStorageIds: string[]): Promise<string> {
    if (!imageStorageIds.length) return ''

    try {
        const dnaSnippets = await Promise.all(
            imageStorageIds.map(async (storageId: string) => {
                const res = await fetch(`${process.env.CONVEX_SITE_URL}/api/storage/${storageId}`)
                if (!res.ok) return null
                const arrayBuffer = await res.arrayBuffer()
                const buffer = Buffer.from(arrayBuffer)
                const { width = 1440, height = 900 } = await sharp(buffer).metadata()

                const dna = await extractVisualDNA(
                    { id: storageId, x: 0, y: 0, w: width, h: height, centerX: width / 2, centerY: height / 2, right: width, bottom: height },
                    buffer,
                    width,
                    height
                )
                return dnaToCSS(dna)
            })
        )

        const valid = dnaSnippets.filter(Boolean) as string[]
        if (!valid.length) return ''

        return valid
            .map((css, i) => `Reference image ${i + 1} visual style: ${css}`)
            .join('\n')
    } catch (e) {
        console.error('[create] DNA extraction failed:', e)
        return ''
    }
}

export async function POST(req: NextRequest) {
    try {
        const { prompt, userId, referenceUrls, imageStorageIds = [] } = await req.json()
        if (!prompt || !userId) {
            return NextResponse.json({ error: 'Missing prompt or userId' }, { status: 400 })
        }

        // Extract Visual DNA from any uploaded reference images (same as chat route)
        const imageDNAContext = await extractDNAFromStorageIds(imageStorageIds)

        // Merge DNA context into the stored prompt so style guide + first generation use it
        const enrichedPrompt = imageDNAContext
            ? `${prompt}\n\n[Reference image design analysis]\n${imageDNAContext}`
            : prompt

        // Generate project name from the original prompt (not the enriched one)
        const { text: projectName } = await generateText({
            model: google('gemini-3.1-flash-lite'),
            prompt: `Generate a short 2-4 word project name for this UI prompt. 
            Return ONLY the name, no quotes, no punctuation: "${prompt}"`,
            providerOptions: {
                google: {
                    thinkingConfig: {
                        thinkingLevel: 'low',
                        includeThoughts: false,
                    }
                }
            }
        })

        const token = await convexAuthNextjsToken()

        const projectId = await fetchMutation(
            api.projects.createProject,
            {
                name: projectName.trim(),
                prompt: enrichedPrompt,  // ← enriched prompt stored in DB
                thumbnail: generateGradientThumbnail(),
                referenceUrls,
            },
            { token }
        )

        // Style guide generation uses enrichedPrompt via projectId lookup
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/generate-style-guide`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, promptText: enrichedPrompt }),
        }).catch(() => {})

        return NextResponse.json({ projectId, projectName: projectName.trim() })

    } catch (error) {
        console.error('Project creation error:', error)
        return NextResponse.json(
            {
                error: 'Failed to create project',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        )
    }
}