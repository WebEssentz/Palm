import React from 'react'
import { useTheme } from 'next-themes'
import { GeneratedUIShape } from '@/redux/slice/shapes'
import { useDispatch } from 'react-redux'
import { updateShape } from '@/redux/slice/shapes'
import { AppDispatch } from '@/redux/store'

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
    const dispatch = useDispatch<AppDispatch>()
    const iframeRef = React.useRef<HTMLIFrameElement>(null)
    const hasFetchedTitle = React.useRef(false)

    const { resolvedTheme } = useTheme()
    const isLight = resolvedTheme === 'light'

    const scale = shape.w / DESKTOP_WIDTH
    const internalHeight = shape.h / scale

    const prompt = (shape as any).prompt as string | undefined
    const [title, setTitle] = React.useState<string>('Generated UI')

    // Fire once when uiSpecData settles (streaming is done)
    React.useEffect(() => {
        if (!shape.uiSpecData || hasFetchedTitle.current) return

        const html = stripCodeFences(shape.uiSpecData)
        const isComplete = html.trimEnd().endsWith('>') || html.includes('</body>') || html.includes('</div>')
        if (!isComplete) return

        hasFetchedTitle.current = true

        fetchTitle(prompt ?? 'UI design', html)
            .then(t => {
                setTitle(t)
                dispatch(updateShape({ id: shape.id, patch: { name: t } }))
            })
            .catch(() => {
                const fallback = prompt?.slice(0, 40).trim() ?? 'Generated UI'
                setTitle(fallback)
                dispatch(updateShape({ id: shape.id, patch: { name: fallback } }))
            })
    }, [shape.uiSpecData, prompt, dispatch, shape.id])

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
<script src="https://cdn.tailwindcss.com"><\/script>
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
            {/* Label above the frame */}
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
                <div
                    style={{
                        width: shape.w,
                        height: shape.h,
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.12)',
                        position: 'relative',
                        // ✅ pointer-events auto so canvas receives clicks/drags through the iframe
                        //    (iframe itself has pointer-events:none so it never eats events)
                        pointerEvents: 'auto',
                        overflow: 'hidden',
                        // cursor is intentionally NOT set here — the canvas div owns the cursor
                    }}
                >
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
                            // ✅ already none — this is why the overlay was never needed
                            pointerEvents: 'none',
                        }}
                    />
                    {/*
                     * ❌ Removed: the overlay div that had onPointerDown/Up/Leave + cursor:'move'
                     *    It was intercepting events before they could bubble to the canvas,
                     *    and its cursor style was overriding the canvas-level cursor class.
                     *    The iframe's pointer-events:none already handles event passthrough.
                     */}
                </div>
            ) : (
                <div
                    style={{
                        width: shape.w,
                        height: shape.h,
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        // also allow pointer events when empty so user can still click/move it
                        pointerEvents: 'auto',
                    }}
                >
                    <span
                        style={{
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.4)',
                            fontWeight: 500,
                            letterSpacing: '0.04em',
                            animation: 'pulse 1.5s ease-in-out infinite',
                        }}
                    >
                        Generating UI…
                    </span>
                </div>
            )}
        </div>
    )
}

export default GeneratedUI