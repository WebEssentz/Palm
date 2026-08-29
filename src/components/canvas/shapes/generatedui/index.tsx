import React from 'react'
import { useTheme } from 'next-themes'
import { GeneratedUIShape } from '@/redux/slice/shapes'
import { useDispatch } from 'react-redux'
import { updateShape } from '@/redux/slice/shapes'
import { AppDispatch, useAppSelector } from '@/redux/store'
import { Monitor, Loader2 } from 'lucide-react'

type Props = {
    shape: GeneratedUIShape
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
    const [title, setTitle] = React.useState<string>(shape.name || 'Generated UI')
    const [isTitleLoading, setIsTitleLoading] = React.useState<boolean>(!shape.name && !hasFetchedTitle.current)

    // True only if UI spec was already present on initial mount (page refresh)
    const isPreExisting = React.useRef(Boolean(shape.uiSpecData))
    const [isIframeReady, setIsIframeReady] = React.useState(!isPreExisting.current)

    // Safety fallback so shimmer never gets stuck if iframe load event fired early
    React.useEffect(() => {
        if (isIframeReady) return
        const timer = setTimeout(() => {
            setIsIframeReady(true)
        }, 500)
        return () => clearTimeout(timer)
    }, [isIframeReady])

    // Track viewport scale so text size scales up as user zooms out (Figma style)
    const viewportScale = useAppSelector((state) => state.viewport.scale)
    const labelScale = Math.min(Math.max(1, 1 / (viewportScale || 1)), 4)
    const maxTitleWidth = Math.max(60, (shape.w - 20) / labelScale)

    // Fire once when uiSpecData settles (streaming is done)
    React.useEffect(() => {
        if (!shape.uiSpecData || hasFetchedTitle.current || shape.name) {
            if (shape.name) {
                setTitle(shape.name)
                setIsTitleLoading(false)
            }
            return
        }

        const html = stripCodeFences(shape.uiSpecData)
        const isComplete = html.trimEnd().endsWith('>') || html.includes('</body>') || html.includes('</div>')
        if (!isComplete) return

        hasFetchedTitle.current = true
        setIsTitleLoading(true)

        fetchTitle(prompt ?? 'UI design', html)
            .then(t => {
                setTitle(t)
                setIsTitleLoading(false)
                dispatch(updateShape({ id: shape.id, patch: { name: t } }))
            })
            .catch(() => {
                const fallback = prompt?.slice(0, 40).trim() ?? 'Generated UI'
                setTitle(fallback)
                setIsTitleLoading(false)
                dispatch(updateShape({ id: shape.id, patch: { name: fallback } }))
            })
    }, [shape.uiSpecData, prompt, dispatch, shape.id, shape.name])

    const srcDoc = React.useMemo(() => {
        if (!shape.uiSpecData) return ''
        const html = stripCodeFences(shape.uiSpecData)
        const bgMatch = html.match(/--background:\s*([^;'"]+)/)
        const bgColor = bgMatch ? bgMatch[1].trim() : '#ffffff'

        return `<!DOCTYPE html>
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
            {/* Label above the frame (Figma-style dynamic zoom header with auto-truncation) */}
            <div
                className='flex items-center gap-1.5'
                style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    marginBottom: 8 * labelScale,
                    maxWidth: maxTitleWidth,
                    transformOrigin: 'bottom left',
                    transform: `scale(${labelScale})`,
                    fontSize: 14,
                    fontWeight: 600,
                    color: isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.75)',
                    letterSpacing: '-0.015em',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    transition: 'transform 0.05s ease-out, margin-bottom 0.05s ease-out',
                }}
            >
                {isTitleLoading ? (
                    <>
                        <Loader2
                            className='w-4 h-4 animate-spin flex-shrink-0'
                            style={{
                                opacity: 0.75,
                                color: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)',
                            }}
                        />
                        <span
                            style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                                opacity: 0.8,
                            }}
                        >
                            Loading....
                        </span>
                    </>
                ) : (
                    <>
                        <Monitor
                            className='w-4 h-4 flex-shrink-0'
                            style={{
                                opacity: 0.75,
                                color: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)',
                            }}
                        />
                        <span
                            title={title}
                            style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                            }}
                        >
                            {title}
                        </span>
                    </>
                )}
            </div>

            {shape.uiSpecData ? (
                <div
                    style={{
                        width: shape.w,
                        height: shape.h,
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.12)',
                        position: 'relative',
                        pointerEvents: 'auto',
                        overflow: 'hidden',
                    }}
                >
                    {/* Shimmer — only on page refresh while iframe first paints */}
                    {!isIframeReady && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 2,
                                borderRadius: 8,
                                overflow: 'hidden',
                                background: isLight
                                    ? 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%)'
                                    : 'linear-gradient(90deg, #18181b 25%, #27272a 37%, #18181b 63%)',
                                backgroundSize: '400% 100%',
                                animation: 'shimmer 1.4s ease infinite',
                            }}
                        />
                    )}
                    <style>{`
                        @keyframes shimmer {
                            0%   { background-position: 100% 50%; }
                            100% { background-position:   0% 50%; }
                        }
                    `}</style>
                    <iframe
                        ref={iframeRef}
                        srcDoc={srcDoc}
                        sandbox="allow-scripts"
                        scrolling="no"
                        onLoad={() => setIsIframeReady(true)}
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