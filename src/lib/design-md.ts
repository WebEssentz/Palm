import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { StyleTokens } from './generate-ui'

export interface DesignMDTokens extends StyleTokens {
    typography?: {
        fontFamily: string
        scale?: {
            h1?: string
            h2?: string
            h3?: string
            body?: string
            caption?: string
        }
    }
    radii?: {
        sm?: string
        md?: string
        lg?: string
        full?: string
    }
    shadows?: {
        card?: string
        dropdown?: string
        button?: string
    }
}

export interface DesignMDData {
    name: string
    version: string
    tokens: DesignMDTokens
    rawMarkdown: string
    philosophy?: string
    visualMood?: string
    componentRules?: Record<string, string>
    forbiddenRules?: string[]
}

/**
 * Formats structured design system data into the official Google Stitch DESIGN.md format
 * (YAML front-matter + human-readable Markdown guidelines).
 */
export function serializeToDesignMD(data: {
    name: string
    tokens: StyleTokens
    philosophy?: string
    visualMood?: string
    rules?: string[]
}): string {
    const { name, tokens, philosophy, visualMood, rules = [] } = data

    const yamlFrontMatter = `---
name: "${name.replace(/"/g, '\\"')}"
version: "1.0.0"
tokens:
  colors:
    background: "${tokens.colors.background}"
    foreground: "${tokens.colors.foreground}"
    primary: "${tokens.colors.primary}"
    primary-foreground: "${tokens.colors.primaryForeground}"
    card: "${tokens.colors.card}"
    muted: "${tokens.colors.muted}"
    muted-foreground: "${tokens.colors.mutedForeground}"
    accent: "${tokens.colors.accent}"
    border: "${tokens.colors.border}"
  typography:
    font-family: "${tokens.fonts.sans}"
    scale:
      h1: "2.5rem"
      h2: "1.75rem"
      h3: "1.25rem"
      body: "0.875rem"
      caption: "0.75rem"
  radii:
    base: "${tokens.radius}"
    card: "${tokens.radius}"
    button: "${tokens.radius}"
    full: "9999px"
  shadows:
    card: "0 8px 32px rgba(0, 0, 0, 0.24)"
    subtle: "0 2px 8px rgba(0, 0, 0, 0.08)"
---`

    const body = `# Design System: ${name}

## 1. Design Philosophy & Mood
${philosophy || visualMood || '- Premium, polished, and purposeful visual hierarchy with high contrast and tactile feedback.'}

## 2. Color Palette & Roles
- **Background (\`--background\`):** \`${tokens.colors.background}\`
- **Foreground (\`--foreground\`):** \`${tokens.colors.foreground}\`
- **Primary Accent (\`--primary\`):** \`${tokens.colors.primary}\`
- **Card Surface (\`--card\`):** \`${tokens.colors.card}\`
- **Subtle Muted (\`--muted\`):** \`${tokens.colors.muted}\`
- **Border Stroke (\`--border\`):** \`${tokens.colors.border}\`

## 3. Typography Rules
- **Primary Font:** \`${tokens.fonts.sans}, -apple-system, sans-serif\`
- **Hierarchy:** High-contrast headings, generous line-height (\`1.6\`) for body text, tight tracking for titles.

## 4. Component Patterns
- **Buttons:** \`padding: 10px 20px\`, \`border-radius: ${tokens.radius}\`, high-contrast text, smooth hover opacity (\`0.85\`).
- **Cards & Containers:** \`border: 1px solid var(--border)\`, \`background: var(--card)\`, \`border-radius: ${tokens.radius}\`.
- **Inputs:** \`background: var(--background)\`, \`border: 1px solid var(--border)\`, active outline matching \`--primary\`.

## 5. Anti-Patterns (Forbidden)
${rules.length > 0 ? rules.map(r => `- ${r}`).join('\n') : `- Never use raw, unmapped hex values in components.
- Never use generic placeholder lorem ipsum.
- Never omit container borders or contrast separation.`}
`

    return `${yamlFrontMatter}\n\n${body}`
}

/**
 * Parses a Google Stitch DESIGN.md markdown string into structured tokens and metadata.
 */
export function parseDesignMD(markdown: string): DesignMDData {
    const frontMatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)

    const defaultTokens: StyleTokens = {
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

    if (!frontMatterMatch) {
        return {
            name: 'Generated Design System',
            version: '1.0.0',
            tokens: defaultTokens,
            rawMarkdown: markdown,
        }
    }

    const yamlStr = frontMatterMatch[1]
    const bodyStr = frontMatterMatch[2]

    const getValue = (pattern: RegExp, fallback = ''): string => {
        const m = yamlStr.match(pattern)
        return m ? m[1].trim().replace(/^["']|["']$/g, '') : fallback
    }

    const name = getValue(/name:\s*([^\n]+)/, 'Project Design System')
    const version = getValue(/version:\s*([^\n]+)/, '1.0.0')

    const tokens: DesignMDTokens = {
        colors: {
            background: getValue(/background:\s*([^\n]+)/, defaultTokens.colors.background),
            foreground: getValue(/foreground:\s*([^\n]+)/, defaultTokens.colors.foreground),
            primary: getValue(/primary:\s*([^\n]+)/, defaultTokens.colors.primary),
            primaryForeground: getValue(/primary-foreground:\s*([^\n]+)/, defaultTokens.colors.primaryForeground),
            card: getValue(/card:\s*([^\n]+)/, defaultTokens.colors.card),
            muted: getValue(/muted:\s*([^\n]+)/, defaultTokens.colors.muted),
            mutedForeground: getValue(/muted-foreground:\s*([^\n]+)/, defaultTokens.colors.mutedForeground),
            accent: getValue(/accent:\s*([^\n]+)/, defaultTokens.colors.accent),
            border: getValue(/border:\s*([^\n]+)/, defaultTokens.colors.border),
        },
        fonts: {
            sans: getValue(/font-family:\s*([^\n]+)/, 'Inter'),
        },
        radius: getValue(/base:\s*([^\n]+)/, '0.75rem'),
    }

    return {
        name,
        version,
        tokens,
        rawMarkdown: markdown,
        philosophy: bodyStr,
    }
}

/**
 * AI Generation: Infers a complete, compliant Google Stitch DESIGN.md file
 * directly from the user's prompt or reference context.
 */
export async function generateDesignMDFromPrompt(prompt: string): Promise<DesignMDData> {
    const { text } = await generateText({
        model: google('gemini-3.7-flash'),
        system: `You are an expert design systems architect following the Google Stitch DESIGN.md open standard.
Your job is to generate a comprehensive, production-grade DESIGN.md specification for the requested interface.

You MUST format your output as a valid DESIGN.md document containing:
1. YAML front-matter enclosed in '---' with 'name', 'version', and complete 'tokens' (colors with background, foreground, primary, primary-foreground, card, muted, muted-foreground, accent, border; typography with font-family; radii with base).
2. Markdown body with sections:
   - # Design System: [Name]
   - ## 1. Design Philosophy & Mood
   - ## 2. Color Palette & Roles
   - ## 3. Typography Rules
   - ## 4. Component Patterns
   - ## 5. Anti-Patterns (Forbidden)

Rules:
- For dark/tech/developer/finance prompts, use dark backgrounds (#0a0d14, #0a0a0a, #0d1117) with high-contrast foreground and vivid accents.
- For light/clean/editorial prompts, use crisp white/cream backgrounds (#ffffff, #fafafa, #f8f9fa) with dark foreground.
- Output ONLY the DESIGN.md markdown text. No backtick wrappers around the whole document.`,
        prompt: `Create a Google Stitch DESIGN.md design system for this UI concept:\n\n"${prompt}"`,
    })

    const cleaned = text.replace(/^```markdown\n?/i, '').replace(/^```\n?/, '').replace(/```$/, '').trim()
    const parsed = parseDesignMD(cleaned)
    return {
        ...parsed,
        rawMarkdown: cleaned,
    }
}
