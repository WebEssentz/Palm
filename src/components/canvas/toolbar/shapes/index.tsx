'use client'

import { useInfiniteCanvas } from '@/hooks/use-canvas'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Tool } from '@/redux/slice/shapes'
import { ArrowRight, Circle, Eraser, Hand, Hash, Minus, MousePointer2, Pencil, Square, Type } from 'lucide-react'
import { GlassTooltip } from '@/components/ui/glass-tooltip'
import React from 'react'

const tools: Array<{ id: Tool; icon: React.ReactNode; label: string; shortcut: string }> = [
    { id: 'select',   icon: <MousePointer2 className='w-3.5 h-3.5' />, label: 'Select',    shortcut: 'V' },
    { id: 'pan',      icon: <Hand          className='w-3.5 h-3.5' />, label: 'Pan',       shortcut: 'H' },
    { id: 'frame',    icon: <Hash          className='w-3.5 h-3.5' />, label: 'Frame',     shortcut: 'F' },
    { id: 'rect',     icon: <Square        className='w-3.5 h-3.5' />, label: 'Rectangle', shortcut: 'R' },
    { id: 'ellipse',  icon: <Circle        className='w-3.5 h-3.5' />, label: 'Ellipse',   shortcut: 'O' },
    { id: 'freedraw', icon: <Pencil        className='w-3.5 h-3.5' />, label: 'Free Draw', shortcut: 'P' },
    { id: 'arrow',    icon: <ArrowRight    className='w-3.5 h-3.5' />, label: 'Arrow',     shortcut: 'A' },
    { id: 'line',     icon: <Minus         className='w-3.5 h-3.5' />, label: 'Line',      shortcut: 'L' },
    { id: 'text',     icon: <Type          className='w-3.5 h-3.5' />, label: 'Text',      shortcut: 'T' },
    { id: 'eraser',   icon: <Eraser        className='w-3.5 h-3.5' />, label: 'Eraser',    shortcut: 'E' },
]

const ToolBarShapes = () => {
    const { currentTool, selectTool } = useInfiniteCanvas()

    return (
        <div className='relative flex flex-col items-center gap-0.5 rounded-xl p-1.5 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] shadow-sm'>
            {tools.map((tool, i) => {
                const active = currentTool === tool.id
                return (
                    <React.Fragment key={tool.id}>
                        {/* Divider after pan */}
                        {i === 2 && (
                            <div className='w-full h-px bg-black/[0.06] dark:bg-white/[0.06] my-1' />
                        )}
                        <GlassTooltip side='left' content={`${tool.label} · ${tool.shortcut}`}>
                            <button
                                onClick={() => selectTool(tool.id)}
                                className={cn(
                                    'w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-colors duration-120',
                                    active
                                        ? 'bg-black/[0.07] dark:bg-white/[0.12] text-neutral-900 dark:text-white font-medium'
                                        : 'text-neutral-500 dark:text-neutral-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-neutral-900 dark:hover:text-neutral-200'
                                )}
                            >
                                {tool.icon}
                            </button>
                        </GlassTooltip>
                    </React.Fragment>
                )
            })}
        </div>
    )
}

export default ToolBarShapes