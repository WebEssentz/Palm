import React from 'react'
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

const GeneratedUI = ({ shape }: Props) => {
    const iframeRef = React.useRef<HTMLIFrameElement>(null)
    const scale = shape.w / DESKTOP_WIDTH
    const internalHeight = shape.h / scale

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
            {/* Label */}
            <div
                style={{
                    position: 'absolute',
                    top: -24,
                    left: 0,
                    fontSize: 10,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.5)',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.03em',
                    pointerEvents: 'none',
                }}
            >
                Generated UI
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
                    {/* Clip wrapper — overflow:hidden on transform:scale doesn't clip without this */}
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

                    {/* Click passthrough overlay for canvas selection */}
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