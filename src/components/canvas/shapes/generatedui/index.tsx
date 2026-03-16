import React from 'react'
import { GeneratedUIShape } from '@/redux/slice/shapes'
import { useUpdateContainer } from '@/hooks/use-styles'
import { LiquidGlassButton } from '@/components/buttons/liquid-glass'
import { Download, MessageCircle, Workflow } from 'lucide-react'

type Props = {
    shape: GeneratedUIShape
    toggleInspiration: () => void
    toggleChat: (generatedUIId: string) => void
    generateWorkflow: (generatedUIId: string) => void
    exportDesign: (generatedUIId: string, element: HTMLElement | null) => void
}

const GeneratedUI = ({ shape, toggleInspiration, toggleChat, generateWorkflow, exportDesign }: Props) => {
    const { containerRef, sanitizeHtml } = useUpdateContainer(shape)

    const handleExportDesign = () => {
        if (!shape.uiSpecData) {
            return
        }
        exportDesign(shape.id, containerRef.current)
    }

    const handleGenerateWorkflow = () => {
        generateWorkflow(shape.id)
    }

    const handleDesignChat = () => {
        toggleChat(shape.id)
    }

    const handleInspiration = () => {
        toggleInspiration()
    }

    return (
        <div
            ref={containerRef}
            className='absolute pointer-events-none'
            style={{
                left: shape.x,
                top: shape.y,
                width: shape.w,
                height: 'auto'
            }}
        >
            <div 
                className='w-full h-auto relative rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm'
                style={{
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3) ',
                    padding: '16px',
                    height: 'auto',
                    minHeight: '120px',
                    position: 'relative'
                }}
            >
                <div
                    className='h-auto w-auto'
                    style={{
                        pointerEvents: 'auto',
                        height: 'auto',
                        maxWidth: '100%',
                        boxSizing: 'border-box'
                    }}
                >
                    <div className='absolute -top-8 right-0 flex gap-2'>
                        <LiquidGlassButton
                            size="sm"
                            variant="subtle"
                            onClick={handleExportDesign}
                            disabled={!shape.uiSpecData}
                            style={{ pointerEvents: 'auto' }}
                        >
                            <Download size={12}/>
                            Export
                        </LiquidGlassButton>
                        <LiquidGlassButton
                            size="sm"
                            variant="subtle"
                            onClick={handleGenerateWorkflow}
                            disabled={!shape.uiSpecData}
                            style={{ pointerEvents: 'auto' }}
                        >
                            <Workflow size={12}/>
                            Generate Workflow
                        </LiquidGlassButton>
                        <LiquidGlassButton
                            size="sm"
                            variant="subtle"
                            onClick={handleDesignChat}
                            disabled={!shape.uiSpecData}
                            style={{ pointerEvents: 'auto' }}
                        >
                            <MessageCircle size={12}/>
                            Design Chat
                        </LiquidGlassButton>
                    </div>

                    {shape.uiSpecData ? (
                        <div 
                            className='h-auto'
                            dangerouslySetInnerHTML={{
                                __html: sanitizeHtml(shape.uiSpecData)
                            }}
                        
                        />
                            
                    ) : (
                        <div className="flex items-center p-8 text-white/60">
                            <div className='animate-pulse'>
                                Generating UI...
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div 
                style={{
                    fontSize: '10px'
                }}
                className='absolute -top-6 left-0 text-xs py-1 px-2 rounded whitespace-nowrap text-white/60 bg-black/40'
            >
                Generated UI
            </div>
        </div>
    )
}

export default GeneratedUI