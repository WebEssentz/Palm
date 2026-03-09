'use client'

import { useInfiniteCanvas } from '@/hooks/use-canvas'
import TextSidebar from './text-sidebar'
import { cn } from '@/lib/utils'
import ShapeRenderer from './shapes'
import React from 'react'
import { RectanglePreview } from './shapes/rectangle/preview'
import { FramePreview } from './shapes/frame/preview'
import { EllipsePreview } from './shapes/ellipse/preview'
import { ArrowPreview } from './shapes/arrow/preview'
import { LinePreview } from './shapes/line/preview'
import { FreeDrawStrokePreview } from './shapes/stroke/preview'
import { SelectionOverlay } from './shapes/selection'

type Props = {}

const InfiniteCanvas = (props: Props) => {
  const {
    viewport,
    shapes,
    currentTool,
    selectedShapes,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onPointerMove,
    attachCanvasRef,
    getDraftShape,
    getFreeDrawPoints,
    isSidebarOpen,
    hasSelectedText
  } = useInfiniteCanvas()


  const draftShape = getDraftShape()
  const freeDrawPoints = getFreeDrawPoints()


  return (
    <>
      <TextSidebar isOpen={isSidebarOpen && hasSelectedText} />
      {/* <Inspiration />
        <ChatWindow /> */}

      <div
        ref={attachCanvasRef}
        color="application"
        aria-label="Infinite drawing canvas"
        className={cn(
          'relative w-full h-full overflow-hidden select-none z-0',
          {
            'cursor-pointer': viewport.mode === 'panning',
            'cursor-grab': viewport.mode === 'shiftPanning',
            'cursor-crosshair': currentTool !== 'select' && currentTool !== 'eraser' && viewport.mode === 'idle',
            'cursor-default': currentTool === 'select' && viewport.mode === 'idle'
          }
        )}
        style={{
          touchAction: 'none',
          cursor: currentTool === 'eraser'
            ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='rgba(128,128,128,0.2)' stroke='%23888888' stroke-width='2'/%3E%3C/svg%3E") 12 12, auto`
            : undefined
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
        draggable={false}
      >
        <div
          className='absolute origin-top-left pointer-events-none z-10'
          style={{
            transform: `translate3d(${viewport.translate.x}px, ${viewport.translate.y}px, 0) scale(${viewport.scale})`,
            transformOrigin: '0 0',
            willChange: 'transform'
          }}
        >
          {shapes.map((shape) => (
            <ShapeRenderer
              key={shape.id}
              shape={shape}
            // toggleInspiration={toogleInspiration}
            // toggleChat={toogleChat}
            // generateWorkflow={generateWorkflow}
            // exportDesign={exportDesign}
            />
          ))}

          {shapes.map((shape) => (
            <SelectionOverlay
              key={`selection-${shape.id}`}
              shape={shape}
              isSelected={!!selectedShapes[shape.id]}
            />
          ))}

          {draftShape && draftShape.type === 'rect' && (
            <RectanglePreview
              startWorld={draftShape.startWorld}
              currentWorld={draftShape.currentWorld}
            />
          )}

          {draftShape && draftShape.type === 'frame' && (
            <FramePreview
              startWorld={draftShape.startWorld}
              currentWorld={draftShape.currentWorld}
            />
          )}

          {draftShape && draftShape.type === 'ellipse' && (
            <EllipsePreview
              startWorld={draftShape.startWorld}
              currentWorld={draftShape.currentWorld}
            />
          )}

          {draftShape && draftShape.type === 'line' && (
            <LinePreview
              startWorld={draftShape.startWorld}
              currentWorld={draftShape.currentWorld}
            />
          )}

          {draftShape && draftShape.type === 'arrow' && (
            <ArrowPreview
              startWorld={draftShape.startWorld}
              currentWorld={draftShape.currentWorld}
            />
          )}

          {currentTool === 'freedraw' && freeDrawPoints.length > 1 && (
            <FreeDrawStrokePreview points={freeDrawPoints}/>
          )}
        </div>
      </div>

    </>
  )
}

export default InfiniteCanvas