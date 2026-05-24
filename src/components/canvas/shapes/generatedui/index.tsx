import React from 'react'
import { useTheme } from 'next-themes'
import { GeneratedUIShape } from '@/redux/slice/shapes'

type Props = {
    shape: GeneratedUIShape
    toggleInspiration: () => void
    toggleChat: (generatedUIId: string) => void
    generateWorkflow: (generatedUIId: string) => void
    exportDesign: (generatedUIId: string, element: HTMLElement | null) => void
}

const DESKTOP_WIDTH = 1440

function stripCodeFences(html: string): string {
    return html
        .replace(/^```[\w]*\n?/gm, '')
        .replace(/```$/gm, '')
        .trim()
}



async function fetchTitle(userPrompt: string, htmlSnippet: string): Promise<string> {
    const res = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt, htmlSnippet }),
    })
    const { title, error } = await res.json()
    if (!res.ok || !title) throw new Error(error)
    return title
}

const GeneratedUI = ({ shape }: Props) => {
    const iframeRef = React.useRef<HTMLIFrameElement>(null)
    const hasFetchedTitle = React.useRef(false)

    const { resolvedTheme } = useTheme()
    const isLight = resolvedTheme === 'light'

    const scale = shape.w / DESKTOP_WIDTH
    const internalHeight = shape.h / scale

    // Grab prompt from shape — add `prompt?: string` to GeneratedUIShape
    const prompt = (shape as any).prompt as string | undefined

    const [title, setTitle] = React.useState<string>('Generated UI')

    // Fire once when uiSpecData settles (streaming is done)
    React.useEffect(() => {
        if (!shape.uiSpecData || hasFetchedTitle.current) return

        // Guard: don't fetch mid-stream — wait until the HTML looks complete
        const html = stripCodeFences(shape.uiSpecData)
        const isComplete = html.trimEnd().endsWith('>') || html.includes('</body>') || html.includes('</div>')
        if (!isComplete) return

        hasFetchedTitle.current = true

        fetchTitle(prompt ?? 'UI design', html)
            .then(setTitle)
            .catch(() => {
                // Graceful fallback — use first ~40 chars of prompt
                if (prompt) setTitle(prompt.slice(0, 40).trim())
            })
    }, [shape.uiSpecData, prompt])

    React.useEffect(() => {
        if (!iframeRef.current || !shape.uiSpecData) return

        const html = stripCodeFences(shape.uiSpecData)
        const bgMatch = html.match(/--background:\s*([^;'"]+)/)
        const bgColor = bgMatch ? bgMatch[1].trim() : '#ffffff'

        iframeRef.current.srcdoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=1440"/>
<script src="https://cdn.tailwindcss.com"></script>
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 1440px; height: 100%; overflow: hidden; background: ${bgColor}; }
</style>
</head>
<body>${html}</body>
</html>`
    }, [shape.uiSpecData])

    return (
        <div
            className='absolute pointer-events-none'
            style={{ left: shape.x, top: shape.y, width: shape.w, height: shape.h }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: -20,
                    left: 0,
                    fontSize: 11,
                    fontWeight: 500,
                    color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.65)',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.01em',
                    pointerEvents: 'none',
                    userSelect: 'none',
                }}
            >
                {title}
            </div>
            {shape.uiSpecData ? (
                <div style={{
                    width: shape.w,
                    height: shape.h,
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.12)',
                    position: 'relative',
                    pointerEvents: 'auto',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: shape.w,
                        height: shape.h,
                        overflow: 'hidden',
                    }}>
                        <iframe
                            ref={iframeRef}
                            sandbox="allow-scripts"
                            scrolling="no"
                            style={{
                                width: DESKTOP_WIDTH,
                                height: internalHeight,
                                border: 'none',
                                transformOrigin: 'top left',
                                transform: `scale(${scale})`,
                                display: 'block',
                                pointerEvents: 'none',
                            }}
                        />
                    </div>

                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 10,
                        pointerEvents: 'auto',
                        cursor: 'default',
                    }} />
                </div>
            ) : (
                <div style={{
                    width: shape.w,
                    height: shape.h,
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <span style={{
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.4)',
                        fontWeight: 500,
                        letterSpacing: '0.04em',
                        animation: 'pulse 1.5s ease-in-out infinite',
                    }}>
                        Generating UI…
                    </span>
                </div>
            )}
        </div>
    )
}

export default GeneratedUI