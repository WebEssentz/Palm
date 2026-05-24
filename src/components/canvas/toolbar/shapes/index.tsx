'use client'

import { useInfiniteCanvas } from '@/hooks/use-canvas'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Tool } from '@/redux/slice/shapes'
import { ArrowRight, Circle, Eraser, Hand, Hash, Minus, MousePointer2, Pencil, Square, Type } from 'lucide-react'
import { GlassTooltip } from '@/components/ui/glass-tooltip'
import React from 'react'


const tools: Array<{ id: Tool; icon: React.ReactNode; label: string; shortcut: string }> = [
    { id: 'select', icon: <MousePointer2 className='w-3.5 h-3.5' />, label: 'Select', shortcut: 'V' },
    { id: 'pan', icon: <Hand className='w-3.5 h-3.5' />, label: 'Pan', shortcut: 'H' },
    { id: 'frame', icon: <Hash className='w-3.5 h-3.5' />, label: 'Frame', shortcut: 'F' },
    { id: 'rect', icon: <Square className='w-3.5 h-3.5' />, label: 'Rectangle', shortcut: 'R' },
    { id: 'ellipse', icon: <Circle className='w-3.5 h-3.5' />, label: 'Ellipse', shortcut: 'O' },
    { id: 'freedraw', icon: <Pencil className='w-3.5 h-3.5' />, label: 'Free Draw', shortcut: 'P' },
    { id: 'arrow', icon: <ArrowRight className='w-3.5 h-3.5' />, label: 'Arrow', shortcut: 'A' },
    { id: 'line', icon: <Minus className='w-3.5 h-3.5' />, label: 'Line', shortcut: 'L' },
    { id: 'text', icon: <Type className='w-3.5 h-3.5' />, label: 'Text', shortcut: 'T' },
    { id: 'eraser', icon: <Eraser className='w-3.5 h-3.5' />, label: 'Eraser', shortcut: 'E' },
]

const ToolBarShapes = () => {
    const { currentTool, selectTool } = useInfiniteCanvas()
    const { theme, systemTheme } = useTheme()
    const isLight = (theme === 'system' ? systemTheme : theme) === 'light'

    const glassStyle: React.CSSProperties = isLight ? {
        background: 'rgba(250,246,238,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(120,96,60,0.10)',
        boxShadow: [
            '0 0 0 0.5px rgba(100,76,40,0.08)',
            '0 2px 4px rgba(80,60,30,0.06)',
            '0 8px 20px rgba(80,60,30,0.09)',
            'inset 0 1px 0 rgba(255,255,255,0.90)',
            'inset 0 -1px 0 rgba(100,76,40,0.04)',
        ].join(', '),
    } : {
        background: 'rgba(18,18,18,0.85)',
        backdropFilter: 'blur(32px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: [
            '0 0 0 0.5px rgba(255,255,255,0.04)',
            '0 2px 4px rgba(0,0,0,0.12)',
            '0 8px 32px rgba(0,0,0,0.35)',
            '0 4px 24px rgba(0,0,0,0.45)',
            'inset 0 1px 0 rgba(255,255,255,0.08)',
            'inset 0 -1px 0 rgba(0,0,0,0.2)',
        ].join(', '),
    }

    return (
        <div
            className='flex flex-col items-center gap-0.5 rounded-l-2xl rounded-r-none p-1.5'
            style={glassStyle}
        >
            {/* Specular rim */}
            <div
                className='pointer-events-none absolute inset-x-0 top-0 h-[1px] rounded-2xl'
                style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.95) 50%, transparent 95%)' }}
            />
            {tools.map((tool) => (
                <GlassTooltip
                    key={tool.id}
                    side='left'
                    content={`${tool.label} - ${tool.shortcut}`}
                >
                    <button
                        onClick={() => selectTool(tool.id)}
                        className={cn(
                            'w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
                            currentTool === tool.id
                                ? 'text-foreground bg-black/10 dark:bg-white/15'
                                : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10'
                        )}
                    >
                        {tool.icon}
                    </button>
                </GlassTooltip>
            ))}
        </div>
    )
}

export default ToolBarShapes