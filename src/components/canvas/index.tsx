'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useGlobalChat, useInfiniteCanvas } from '@/hooks/use-canvas'
import Substrate from '@/components/home/substrate'
import TextSidebar from './text-sidebar'
import { cn } from '@/lib/utils'
import ShapeRenderer from './shapes'
import { useSearchParams } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { useAppSelector } from '@/redux/store'
import { addGeneratedUI, updateShape } from '@/redux/slice/shapes'
import { RectanglePreview } from './shapes/rectangle/preview'
import { FramePreview } from './shapes/frame/preview'
import { EllipsePreview } from './shapes/ellipse/preview'
import { ArrowPreview } from './shapes/arrow/preview'
import { LinePreview } from './shapes/line/preview'
import { FreeDrawStrokePreview } from './shapes/stroke/preview'
import { SelectionOverlay } from './shapes/selection'
import { HoverOverlay } from './hover-overlay'
import { MarqueeOverlay } from './shapes/marquee'
import { ChatPanel } from './chat-panel'
import { PlanLog } from './plan-log'
import { ChatInput } from './chat-input'
// import InspirationSidebar from './shapes/inspiration-sidebar'


const InfiniteCanvas = () => {
  // Initialize ALL hooks at the top level in a consistent order
  const searchParams = useSearchParams()
  const dispatch = useDispatch()
  const profile = useAppSelector((state) => state.profile)

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
    getMarquee,
    getPointToPoint,
    isSidebarOpen,
    hasSelectedText,
    hoveredShapeId,
    isMoving
  } = useInfiniteCanvas()

  const {
    initFromUrlPrompt,
    activeGeneratedUIId,
    setActiveGeneratedUIId,
    generateWorkflow,
    loadHistory,
    isLoadingHistory,
    ...chat
  } = useGlobalChat()

  // Get derived values from hook returns AFTER all hooks are called
  const draftShape = getDraftShape()
  const freeDrawPoints = getFreeDrawPoints()
  const marquee = getMarquee()
  const pointToPoint = getPointToPoint()
  
  const hoveredShape = hoveredShapeId
    ? shapes.find(s => s.id === hoveredShapeId)
    : null
  const isHoveringGeneratedUI = hoveredShape?.type === 'generatedui'

  const promptFromUrl = searchParams.get('prompt')
  const projectId = searchParams.get('project')
  const imagesParam = searchParams.get('images')
  const initialImageIds: string[] = imagesParam
    ? JSON.parse(decodeURIComponent(imagesParam))
    : []

  // Check if shapes already exist from Convex load
  const existingShapes = useAppSelector((s) => s.shapes.shapes?.ids ?? [])



  // Sidebar open state (lifted from ChatPanel)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [agentPanelOpen, setAgentPanelOpen] = useState(false) // ← add this
  const planLogRef = React.useRef<HTMLDivElement>(null)
  const [planLogHeight, setPlanLogHeight] = useState(36) // collapsed default

  // Measure PlanLog whenever it opens/closes
  React.useEffect(() => {
    if (!planLogRef.current) return
    const observer = new ResizeObserver(entries => {
      setPlanLogHeight(entries[0].contentRect.height)
    })
    observer.observe(planLogRef.current)
    return () => observer.disconnect()
  }, [])

  // Wire ChatInput to sendMessage
  const handleSend = (msg: string, opts?: { urls?: string[]; imageStorageIds?: string[] }) => {
    if (!projectId) return
    chat.sendMessage(msg, projectId, opts)
  }

  // Load chat history from Convex on mount
  useEffect(() => {
    if (projectId) loadHistory(projectId)
  }, [projectId, loadHistory])

  useEffect(() => {
    if (isLoadingHistory) return
    if (!promptFromUrl || !projectId) return
    if (chat.chatTurns.length > 0) return
    if (existingShapes.length > 0) return

    initFromUrlPrompt(
      decodeURIComponent(promptFromUrl),
      projectId,
      () => { },
      () => console.log('Initial generation done'),
      initialImageIds
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingHistory, promptFromUrl, projectId, chat.chatTurns.length, existingShapes.length, initialImageIds])

  // Listen for frame selection and auto-jump to the generating turn
  useEffect(() => {
    const handler = (e: Event) => {
      const { id } = (e as CustomEvent).detail
      if (!id) return

      // Find the turn that generated this shape
      const turn = chat.chatTurns.find(t => t.generatedShapeId === id)
      if (turn) {
        chat.setExpandedTurnId(turn.id)
        setSidebarOpen(true)   // open panel if collapsed
      }
    }
    window.addEventListener('frame-selected', handler)
    return () => window.removeEventListener('frame-selected', handler)
  }, [chat.chatTurns, chat])

  return (
    <div className='fixed inset-0 flex flex-col'>
      <TextSidebar isOpen={isSidebarOpen && hasSelectedText} />

      {/* ── ChatPanel — stops above PlanLog dynamically ── */}
      <div
        className='fixed left-3 top-14 z-50 pointer-events-none'
        style={{
          width: sidebarOpen ? 296 : 72,
          bottom: planLogHeight + 28, // 20px bottom offset + 8px gap
          transition: 'width 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div className={`pointer-events-auto flex flex-col ${sidebarOpen ? 'h-full' : ''}`}>
          <ChatPanel
            turns={chat.chatTurns}
            expandedTurnId={chat.expandedTurnId}
            onExpandTurn={chat.setExpandedTurnId}
            profile={profile}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(o => !o)}
            toolStatus={chat.toolStatus}
          />
        </div>
      </div>

      {/* ── PlanLog — fully independent, owns its own width ── */}
      <div
        ref={planLogRef}
        className='fixed left-3 bottom-5 z-50 pointer-events-none'
        style={{
          width: agentPanelOpen ? 296 : 80,
          transition: 'width 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div className='pointer-events-auto'>
          <PlanLog
            turns={chat.chatTurns}
            selectedTurnId={chat.expandedTurnId}
            onSelectTurn={(id) => {
              chat.setExpandedTurnId(id)
              setSidebarOpen(true)
            }}
            isOpen={agentPanelOpen}
            onToggle={() => setAgentPanelOpen(o => !o)}
          />
        </div>
      </div>

      <div className='flex flex-1 min-h-0'>
        <div className='flex flex-col flex-1 min-w-0'>
          <div
            ref={attachCanvasRef}
            tabIndex={0}
            aria-label="Infinite drawing canvas"
            className={cn(
              'relative flex-1 overflow-hidden select-none z-0',
              {
                // canvas pan takes priority
                'cursor-grabbing': viewport.mode === 'panning' || viewport.mode === 'shiftPanning'
                  || (isMoving && isHoveringGeneratedUI),
                'cursor-grab': (currentTool === 'pan' && viewport.mode === 'idle')
                  || (currentTool === 'select' && isHoveringGeneratedUI && !isMoving && viewport.mode === 'idle'),
                'cursor-crosshair': currentTool !== 'select' && currentTool !== 'eraser' && currentTool !== 'pan' && viewport.mode === 'idle',
                'cursor-default': currentTool === 'select' && !isHoveringGeneratedUI && viewport.mode === 'idle'
              }
            )}
            style={{
              touchAction: 'none',
              outline: 'none',
              cursor: currentTool === 'eraser'
                ? `url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='rgba(128,128,128,0.2)' stroke='%23888888' stroke-width='2'/%3E%3C/svg%3E\") 12 12, auto`
                : undefined
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          >
            <Substrate />

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
                  selectedShapes={selectedShapes}
                  toggleInspiration={() => { }}
                  // toggleChat={toogleChat}
                  generateWorkflow={generateWorkflow}
                // exportDesign={exportDesign}
                />
              ))}

              {shapes.map((shape) => (
                <SelectionOverlay
                  key={`selection-${shape.id}`}
                  shape={shape}
                  isSelected={
                    !!selectedShapes[shape.id] &&
                    !(shape.type === 'text' && hasSelectedText)
                  }
                />
              ))}

              {/* Hover overlay — only show when not selected */}
              {hoveredShapeId && (() => {
                const shape = shapes.find(s => s.id === hoveredShapeId)
                if (!shape || selectedShapes[hoveredShapeId]) return null
                return <HoverOverlay key={`hover-${shape.id}`} shape={shape} />
              })()}

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
                <FreeDrawStrokePreview points={freeDrawPoints} />
              )}

              {pointToPoint && pointToPoint.type === 'line' && (
                <LinePreview
                  startWorld={pointToPoint.startWorld}
                  currentWorld={pointToPoint.currentWorld}
                />
              )}

              {pointToPoint && pointToPoint.type === 'arrow' && (
                <ArrowPreview
                  startWorld={pointToPoint.startWorld}
                  currentWorld={pointToPoint.currentWorld}
                />
              )}

              {pointToPoint && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: pointToPoint.startWorld.x - 4,
                    top: pointToPoint.startWorld.y - 4,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    zIndex: 100,
                  }}
                />
              )}

              {marquee && (
                <MarqueeOverlay
                  startWorld={marquee.start}
                  currentWorld={marquee.current}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ChatInput wired to sendMessage ── */}
      <div className='fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none'>
        <div className='pointer-events-auto'>
          <ChatInput
            onSend={handleSend}
            isLoading={chat.isSending}
            attachedFrameId={activeGeneratedUIId}
            attachedFrameName={chat.attachedFrameName}
            attachedThumbnailUrl={chat.attachedThumbnailUrl}
            onDetachFrame={() => setActiveGeneratedUIId(null)}
          />
        </div>
      </div>
    </div>
  )
}

export default InfiniteCanvas