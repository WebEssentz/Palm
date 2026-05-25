import { streamText, generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { readFileSync } from 'fs'
import { join } from 'path'
import { StyleGuideQuery } from '@/convex/query.config'

const uiSkill = readFileSync(
    join(process.cwd(), 'skills/ui-generation/SKILL.md'), 'utf-8'
)
const layoutTokens = readFileSync(
    join(process.cwd(), 'skills/ui-generation/layout-tokens.md'), 'utf-8'
)

export interface StyleTokens {
    colors: {
        background: string
        foreground: string
        primary: string
        primaryForeground: string
        card: string
        muted: string
        mutedForeground: string
        accent: string
        border: string
    }
    fonts: { sans: string }
    radius: string
}

export async function inferStyleTokensFromPrompt(prompt: string): Promise<StyleTokens> {
    const { text } = await generateText({
        model: google('gemini-3.5-flash'),
        system: 'You extract design tokens from a description. Return ONLY valid JSON, no markdown, no explanation.',
        prompt: [
            'From this UI description, infer a complete design system as JSON:',
            '',
            '"' + prompt + '"',
            '',
            'Return exactly this shape:',
            '{',
            '  "colors": {',
            '    "background": "#hex",',
            '    "foreground": "#hex",',
            '    "primary": "#hex",',
            '    "primaryForeground": "#hex",',
            '    "card": "#hex",',
            '    "muted": "#hex",',
            '    "mutedForeground": "#hex",',
            '    "accent": "#hex",',
            '    "border": "#hex"',
            '  },',
            '  "fonts": { "sans": "font name e.g. Inter, Geist, Helvetica Neue" },',
            '  "radius": "e.g. 0.5rem"',
            '}',
            '',
            'Rules:',
            '- Dark/luxury/premium prompts: dark backgrounds (#0a0a0a, #111, #1a1a1a), white foreground',
            '- Light/minimal/clean prompts: white or near-white backgrounds, dark foreground',
            '- Match the aesthetic precisely. Return ONLY the JSON object.',
        ].join('\n'),
    })

    try {
        return JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {
        return {
            colors: {
                background: '#0a0a0a',
                foreground: '#ffffff',
                primary: '#ffffff',
                primaryForeground: '#0a0a0a',
                card: '#111111',
                muted: '#1a1a1a',
                mutedForeground: '#888888',
                accent: '#333333',
                border: '#222222',
            },
            fonts: { sans: 'Inter' },
            radius: '0.75rem',
        }
    }
}

export function buildTokensFromGuide(guide: any): StyleTokens {
    const getColor = (name: string): string => {
        for (const section of guide.colorSections || []) {
            for (const swatch of section.swatches || []) {
                if (swatch.name.toLowerCase() === name.toLowerCase()) return swatch.hexColor
            }
        }
        return '#cccccc'
    }

    return {
        colors: {
            background: getColor('background'),
            foreground: getColor('foreground'),
            primary: getColor('primary'),
            primaryForeground: getColor('primaryForeground'),
            card: getColor('card'),
            muted: getColor('muted'),
            mutedForeground: getColor('mutedForeground'),
            accent: getColor('accent'),
            border: getColor('border'),
        },
        fonts: { sans: guide.typographySections?.[0]?.styles?.[0]?.fontFamily || 'Inter' },
        radius: '0.75rem',
    }
}

export interface UIDiffPatch {
    selector: string
    property?: string  // for css-inject
    value: string
}

export interface UIDiff {
    type: 'css-inject' | 'block-replace' | 'full-regen'
    patches: UIDiffPatch[]
}

export interface GenerateUIOptions {
    prompt: string
    projectId: string
    currentHTML?: string
    styleTokens?: StyleTokens
}

export async function* generateUIStream(opts: GenerateUIOptions): AsyncGenerator<string> {
    const { prompt, projectId, currentHTML } = opts

    let styleTokens: StyleTokens

    if (opts.styleTokens) {
        // Caller already resolved tokens (e.g. from /api/chat after inferring)
        styleTokens = opts.styleTokens
    } else {
        const { styleGuide } = await StyleGuideQuery(projectId)
        const guide = styleGuide?._valueJSON as any

        if (guide) {
            styleTokens = buildTokensFromGuide(guide)
        } else {
            console.log('No style guide in DB — inferring from prompt...')
            styleTokens = await inferStyleTokensFromPrompt(prompt)
        }
    }

    const cssVars = Object.entries(styleTokens.colors)
        .map(([k, v]) => {
            const cssKey = k.replace(/([A-Z])/g, (m) => '-' + m.toLowerCase())
            return '--' + cssKey + ': ' + v
        })
        .join('; ')

    // Build prompt parts as array to avoid backtick conflicts
    const parts: string[] = []

    parts.push('## USER PROMPT')
    parts.push('"' + prompt + '"')
    parts.push('')
    parts.push('## COMPONENT LIBRARY')
    parts.push(layoutTokens)
    parts.push('')

    if (currentHTML) {
        parts.push('## CURRENT DESIGN')
        parts.push('```html')
        parts.push(currentHTML.slice(0, 4000))
        parts.push('```')
        parts.push('')
    }

    parts.push('## DESIGN TOKENS')
    parts.push('```json')
    parts.push(JSON.stringify(styleTokens, null, 2))
    parts.push('```')
    parts.push('')
    parts.push('## RULES')
    parts.push('- Generate a complete, production-quality HTML page')
    parts.push('- Use Tailwind CSS via CDN')
    parts.push('- Use the provided design tokens exactly (colors, fonts, radius)')
    parts.push('- No placeholder images — use solid color blocks or SVG icons')
    parts.push('- Output ONLY the HTML, no explanation')

    const userPrompt = parts.join('\n')

    const systemParts: string[] = []
    systemParts.push(uiSkill)
    systemParts.push('')
    systemParts.push('You are generating a UI from a text prompt only — no reference image.')
    systemParts.push('Infer layout, spacing, and visual hierarchy from the prompt description.')
    systemParts.push('Use modern design patterns appropriate to the described interface.')
    systemParts.push('')
    systemParts.push('Design tokens:')
    systemParts.push('- Colors (CSS vars): ' + cssVars)
    systemParts.push('- Font family: ' + styleTokens.fonts.sans)
    systemParts.push('- Border radius: ' + styleTokens.radius)

    if (currentHTML) {
        systemParts.push('')
        systemParts.push('You are iterating on an existing design. Preserve good patterns while making the requested improvements.')
    }

    const systemPrompt = systemParts.join('\n')

    const result = streamText({
        model: google('gemini-3.5-flash'),
        system: systemPrompt,
        messages: [
            {
                role: 'user',
                content: [{ type: 'text', text: userPrompt }],
            },
        ],
        temperature: 0.7,
        providerOptions: {
            google: {
                thinkingConfig: {
                    thinkingLevel: 'high',
                    includeThoughts: false,
                },
            },
        },
    })

    // SDK 6: textStream is not a Promise — no await
    const reader = result.textStream.getReader()
    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            yield value
        }
    } finally {
        reader.releaseLock()
    }
}

/**
 * Generate a surgical diff instead of full HTML.
 * Returns patches (CSS or block replacements) to apply to existing design.
 */
export async function* generateUIDiffStream(opts: GenerateUIOptions): AsyncGenerator<string> {
    const { prompt, projectId, currentHTML } = opts

    if (!currentHTML) {
        throw new Error('generateUIDiffStream requires currentHTML')
    }

    let styleTokens: StyleTokens

    if (opts.styleTokens) {
        styleTokens = opts.styleTokens
    } else {
        const { styleGuide } = await StyleGuideQuery(projectId)
        const guide = styleGuide?._valueJSON as any

        if (guide) {
            styleTokens = buildTokensFromGuide(guide)
        } else {
            styleTokens = await inferStyleTokensFromPrompt(prompt)
        }
    }

    const cssVars = Object.entries(styleTokens.colors)
        .map(([k, v]) => {
            const cssKey = k.replace(/([A-Z])/g, (m) => '-' + m.toLowerCase())
            return '--' + cssKey + ': ' + v
        })
        .join('; ')

    const parts: string[] = []

    parts.push('## USER INTENT')
    parts.push('"' + prompt + '"')
    parts.push('')
    parts.push('## CURRENT DESIGN')
    parts.push('```html')
    parts.push(currentHTML.slice(0, 6000))
    parts.push('```')
    parts.push('')
    parts.push('## DESIGN TOKENS')
    parts.push('```json')
    parts.push(JSON.stringify(styleTokens, null, 2))
    parts.push('```')
    parts.push('')
    parts.push('## TASK: SURGICAL DIFF')
    parts.push('Instead of regenerating the entire HTML, return ONLY the CSS and HTML patches needed.')
    parts.push('Output a JSON object with this shape:')
    parts.push('```json')
    parts.push('{')
    parts.push('  "type": "css-inject" | "block-replace",  // css-inject: update styles; block-replace: replace a section')
    parts.push('  "patches": [')
    parts.push('    { "selector": ".button", "property": "box-shadow", "value": "0 4px 12px rgba(0,0,0,0.15)" },')
    parts.push('    { "selector": ".hero", "property": null, "value": "<new HTML block>" }  // if block-replace')
    parts.push('  ]')
    parts.push('}')
    parts.push('```')
    parts.push('Return ONLY the JSON, no markdown wrapping.')

    const userPrompt = parts.join('\n')

    const systemParts: string[] = []
    systemParts.push(uiSkill)
    systemParts.push('')
    systemParts.push('You are optimizing an existing design via surgical patches, NOT regenerating.')
    systemParts.push('Return a JSON diff object with only the CSS rules or HTML blocks that changed.')
    systemParts.push('This makes the design iteration faster and preserves untouched elements.')
    systemParts.push('')
    systemParts.push('Design tokens:')
    systemParts.push('- Colors (CSS vars): ' + cssVars)
    systemParts.push('- Font family: ' + styleTokens.fonts.sans)
    systemParts.push('- Border radius: ' + styleTokens.radius)

    const systemPrompt = systemParts.join('\n')

    const result = streamText({
        model: google('gemini-3.5-flash'),
        system: systemPrompt,
        messages: [
            {
                role: 'user',
                content: [{ type: 'text', text: userPrompt }],
            },
        ],
        temperature: 0.7,
        providerOptions: {
            google: {
                thinkingConfig: {
                    thinkingLevel: 'high',
                    includeThoughts: false,
                },
            },
        },
    })

    const reader = result.textStream.getReader()
    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            yield value
        }
    } finally {
        reader.releaseLock()
    }
}

/**
 * Classify the user's intent: is this a surgical edit or full regeneration?
 * Returns 'surgical' for "make the button bigger", 'full' for "completely redesign"
 */
export async function classifyEditIntent(prompt: string, currentHTML?: string): Promise<'surgical' | 'full'> {
    if (!currentHTML) return 'full'

    const { text } = await generateText({
        model: google('gemini-3.5-flash'),
        system: 'You are classifying UI design intents. Return ONLY "surgical" or "full".\n\nSurgical: small tweaks, color changes, button edits, spacing fixes, text updates\nFull: complete redesign, new layout, different aesthetic, major restructuring',
        prompt: `User request: "${prompt}"\n\nCurrent HTML: ${currentHTML.slice(0, 2000)}\n\nClassify this intent as "surgical" or "full".`,
    })

    const normalized = text.toLowerCase().trim()
    return normalized.includes('surgical') ? 'surgical' : 'full'
}