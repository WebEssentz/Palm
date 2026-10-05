'use client'

import { useInfiniteCanvas } from '@/hooks/use-canvas'
import { cn } from '@/lib/utils'
import { Tool } from '@/redux/slice/shapes'
import {
    ArrowRight,
    Circle,
    Eraser,
    Grip,
    Hand,
    Hash,
    Minus,
    MoreHorizontal,
    MousePointer2,
    PanelBottom,
    PanelLeft,
    PanelRight,
    Pencil,
    Plus,
    Square,
    Type,
} from 'lucide-react'
import { FlyoutMenu, FlyoutMenuItem, MenuOption } from '@/components/ui/flyout-menu'
import { ToolHoverCard, ToolInfo } from '@/components/ui/tool-hover-card'
import React from 'react'
import { ToolbarPosition, useCanvasPrefs } from '@/hooks/use-canvas-prefs'

/**
 * To add a tool: drop a new object in here (id, icon, label, tagline, description, shortcut).
 * The hover card + button are generated from it. Optional `preview` swaps the big icon
 * for an image / gif / video.
 */
const tools: Array<ToolInfo & { id: Tool }> = [
    {
        id: 'select',
        icon: MousePointer2,
        label: 'Select',
        tagline: 'Select and move canvas items.',
        description: 'Click to select, drag to move, and use the handles to resize shapes and frames on the canvas.',
        shortcut: 'V',
    },
    {
        id: 'pan',
        icon: Hand,
        label: 'Pan',
        tagline: 'Move around the canvas.',
        description: 'Drag to move around the canvas without touching anything you have placed.',
        shortcut: 'H',
    },
    {
        id: 'frame',
        icon: Hash,
        label: 'Frame',
        tagline: 'Create a frame.',
        description: 'Draw a frame to group elements together and mark out a screen or section of your design.',
        shortcut: 'F',
    },
    {
        id: 'rect',
        icon: Square,
        label: 'Rectangle',
        tagline: 'Draw a rectangle.',
        description: 'Click and drag to draw a rectangle. Good for cards, buttons, and background blocks.',
        shortcut: 'R',
    },
    {
        id: 'ellipse',
        icon: Circle,
        label: 'Ellipse',
        tagline: 'Draw an ellipse.',
        description: 'Click and drag to draw an ellipse or circle. Good for avatars, badges, and highlights.',
        shortcut: 'O',
    },
    {
        id: 'line',
        icon: Minus,
        label: 'Line',
        tagline: 'Draw a straight line.',
        description: 'Click and drag to draw a straight line. Good for dividers and connecting elements.',
        shortcut: 'L',
    },
    {
        id: 'arrow',
        icon: ArrowRight,
        label: 'Arrow',
        tagline: 'Draw an arrow.',
        description: 'Click and drag to draw an arrow. Good for flows, callouts, and pointing things out.',
        shortcut: 'A',
    },
    {
        id: 'freedraw',
        icon: Pencil,
        label: 'Free Draw',
        tagline: 'Sketch freehand.',
        description: 'Draw freely with your cursor. Good for quick sketches, annotations, and rough ideas.',
        shortcut: 'P',
    },
    {
        id: 'text',
        icon: Type,
        label: 'Text',
        tagline: 'Add text to the canvas.',
        description: 'Click anywhere on the canvas to add text. Good for labels, headings, and notes.',
        shortcut: 'T',
    },
    {
        id: 'eraser',
        icon: Eraser,
        label: 'Eraser',
        tagline: 'Remove canvas items.',
        description: 'Click or drag over items on the canvas to erase them.',
        shortcut: 'E',
    },
]

// The top "+" button. No shortcut yet, so the card skips the footer.
const addTool: ToolInfo = {
    icon: Plus,
    label: 'Add',
    tagline: 'Add something new.',
    description: 'Add a new element to your canvas and place it into your workflow.',
}

const positionOptions: MenuOption[] = [
    { value: 'right', label: 'Right', icon: PanelRight },
    { value: 'bottom', label: 'Bottom', icon: PanelBottom },
    { value: 'left', label: 'Left', icon: PanelLeft },
]

const ToolBarShapes = () => {
    const { currentTool, selectTool } = useInfiniteCanvas()
    const { toolbarPosition, setToolbarPosition, showDotGrid, setShowDotGrid } = useCanvasPrefs()

    const menuItems: FlyoutMenuItem[] = [
        {
            type: 'submenu',
            id: 'toolbar-position',
            label: 'Toolbar position',
            icon: PanelLeft,
            options: positionOptions,
            value: toolbarPosition,
            onSelect: (v) => setToolbarPosition(v as ToolbarPosition),
        },
        { type: 'divider', id: 'divider-1' },
        {
            type: 'toggle',
            id: 'dot-grid',
            label: 'Show dot grid',
            icon: Grip,
            checked: showDotGrid,
            onChange: setShowDotGrid,
        },
    ]

    return (
        <div
            className='relative flex flex-col items-center gap-0.5 py-1 px-1 bg-white/95 dark:bg-[#141416]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] shadow-lg'
            style={{
                borderTopLeftRadius: '45% 18px',
                borderTopRightRadius: '45% 18px',
                borderBottomLeftRadius: '45% 18px',
                borderBottomRightRadius: '45% 18px',
            }}
        >
            {/* Top: Plus button */}
            <ToolHoverCard info={addTool}>
                <button
                    type='button'
                    className='w-10 h-10 flex items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-95 transition-all duration-150 cursor-pointer shadow-xs'
                >
                    <Plus className='w-5 h-5' strokeWidth={2} />
                </button>
            </ToolHoverCard>

            {/* Top divider */}
            <div className='w-6 h-px bg-black/[0.08] dark:bg-white/[0.08] my-1' />

            {/* All canvas tools between the dividers */}
            {tools.map((tool) => {
                const active = currentTool === tool.id
                const Icon = tool.icon
                return (
                    <ToolHoverCard key={tool.id} info={tool}>
                        <button
                            onClick={() => selectTool(tool.id)}
                            className={cn(
                                'w-10 h-8.5 flex items-center justify-center rounded-xl cursor-pointer transition-all duration-150',
                                active
                                    ? 'bg-black/[0.08] dark:bg-white/[0.14] text-neutral-900 dark:text-white font-medium shadow-xs'
                                    : 'text-neutral-500 dark:text-neutral-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-neutral-900 dark:hover:text-neutral-200'
                            )}
                        >
                            <Icon className='w-5 h-5' strokeWidth={1.8} />
                        </button>
                    </ToolHoverCard>
                )
            })}

            {/* Bottom divider */}
            <div className='w-6 h-px bg-black/[0.08] dark:bg-white/[0.08] my-1' />

            {/* Bottom: More horizontal, opens the flyout menu */}
            <FlyoutMenu items={menuItems}>
                {(open) => (
                    <button
                        type='button'
                        aria-label='More'
                        className={cn(
                            'w-10 h-8.5 flex items-center justify-center rounded-xl cursor-pointer transition-all duration-150',
                            open
                                ? 'bg-black/[0.08] dark:bg-white/[0.14] text-neutral-900 dark:text-white'
                                : 'text-neutral-500 dark:text-neutral-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-neutral-900 dark:hover:text-neutral-200'
                        )}
                    >
                        <MoreHorizontal className='w-5 h-5' strokeWidth={1.8} />
                    </button>
                )}
            </FlyoutMenu>
        </div>
    )
}

export default ToolBarShapes