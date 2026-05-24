import { NextRequest, NextResponse } from 'next/server'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { fetchMutation } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '../../../../../convex/_generated/api'

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

export async function POST(req: NextRequest) {
    try {
        const { prompt, userId, referenceUrls } = await req.json()
        if (!prompt || !userId) {
            return NextResponse.json({ error: 'Missing prompt or userId' }, { status: 400 })
        }

        // Generate project name
        const { text: projectName } = await generateText({
            model: google('gemini-3.5-flash'),
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

        // Create project in Convex with auto-generated gradient thumbnail
        const projectId = await fetchMutation(
            api.projects.createProject,
            { name: projectName.trim(), prompt, thumbnail: generateGradientThumbnail(), referenceUrls },
            { token }
        )

        // Fire style guide in background — don't await
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/generate-style-guide`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, promptText: prompt }),
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
