import React from 'react'
import { GeneratedUIShape } from '@/redux/slice/shapes'
import { LiquidGlassButton } from '@/components/buttons/liquid-glass'
import { Download, MessageCircle, Workflow } from 'lucide-react'

type Props = {
    shape: GeneratedUIShape
    toggleInspiration: () => void
    toggleChat: (generatedUIId: string) => void
    generateWorkflow: (generatedUIId: string) => void
    exportDesign: (generatedUIId: string, element: HTMLElement | null) => void
}

const DESKTOP_WIDTH = 1440 // render at full desktop width

function stripCodeFences(html: string): string {
    return html
        .replace(/^```[\w]*\n?/gm, '')
        .replace(/```$/gm, '')
        .trim()
}

const GeneratedUI = ({ shape, toggleInspiration, toggleChat, generateWorkflow, exportDesign }: Props) => {
    const iframeRef = React.useRef<HTMLIFrameElement>(null)
    const scale = shape.w / DESKTOP_WIDTH
    // The internal height the iframe should think it has (at 1440px width)
    // to match the shape's current visual height on the canvas.
    const internalHeight = shape.h / scale

    React.useEffect(() => {
        if (!iframeRef.current || !shape.uiSpecData) return

        const html = stripCodeFences(shape.uiSpecData)

        // Extract background color from the HTML to apply to body
        const bgMatch = html.match(/--background:\s*([^;'"]+)/)
        const bgColor = bgMatch ? bgMatch[1].trim() : '#ffffff'

        const srcdoc = `<!DOCTYPE html>
<html>
<head>
<meta charset=\"UTF-8\"/>
<meta name=\"viewport\" content=\"width=1440\"/>
<script src=\"https://cdn.tailwindcss.com\"></script>
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { 
        width: 1440px; 
        min-height: 100%;
        overflow-x: hidden;
        background: ${bgColor};
    }
</style>
</head>
<body>
${html}
</body>
</html>`

        iframeRef.current.srcdoc = srcdoc
    }, [shape.uiSpecData])

    return (
        <div
            className='absolute pointer-events-none'
            style={{
                left: shape.x,
                top: shape.y,
                width: shape.w,
                height: shape.h,
            }}
        >
            {/* Toolbar */}
            <div className='absolute -top-8 right-0 flex gap-2' style={{ pointerEvents: 'auto' }}>
                <LiquidGlassButton size="sm" variant="subtle"
                    onClick={() => exportDesign(shape.id, iframeRef.current?.contentDocument?.body || null)}
                    disabled={!shape.uiSpecData}>
                    <Download size={12}/> Export
                </LiquidGlassButton>
                <LiquidGlassButton size="sm" variant="subtle"
                    onClick={() => generateWorkflow(shape.id)}
                    disabled={!shape.uiSpecData}>
                    <Workflow size={12}/> Generate Workflow
                </LiquidGlassButton>
                <LiquidGlassButton size="sm" variant="subtle"
                    onClick={() => toggleChat(shape.id)}
                    disabled={!shape.uiSpecData}>
                    <MessageCircle size={12}/> Design Chat
                </LiquidGlassButton>
            </div>

            {shape.uiSpecData ? (
                <div style={{
                    width: shape.w,
                    height: shape.h,
                    overflow: 'hidden',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    position: 'relative',
                    pointerEvents: 'auto', // iframe needs this for scrolling
                    transition: 'height 0.2s ease',
                }}>
                    <iframe
                        ref={iframeRef}
                        sandbox="allow-scripts"
                        scrolling="yes"
                        style={{
                            width: DESKTOP_WIDTH,
                            height: internalHeight,
                            border: 'none',
                            transformOrigin: 'top left',
                            transform: `scale(${scale})`,
                            display: 'block',
                            pointerEvents: 'none', // iframe doesn't steal clicks
                        }}
                    />
                    {/* Transparent overlay — passes clicks to canvas for selection */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 10,
                        pointerEvents: 'auto', // catches canvas clicks for selection
                        cursor: 'default',
                    }} />
                </div>
            ) : (
                <div className="flex items-center justify-center p-8 text-white/60"
                    style={{ height: shape.h, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}>
                    <div className='animate-pulse'>Generating UI...</div>
                </div>
            )}

            <div
                className='absolute -top-6 left-0 text-xs py-1 px-2 rounded whitespace-nowrap text-white/60 bg-black/40'
                style={{ fontSize: '10px' }}
            >
                Generated UI
            </div>
        </div>
    )
}

export default GeneratedUI