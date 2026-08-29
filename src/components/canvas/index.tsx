'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useGlobalChat, useInfiniteCanvas, ChatTurn } from '@/hooks/use-canvas'
import DotParticleBackground from './dot-particle-background'
import TextSidebar from './text-sidebar'
import { cn } from '@/lib/utils'
import ShapeRenderer from './shapes'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useAppSelector } from '@/redux/store'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
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
import { ChatInput } from './chat-input'
import StyleGuideView from '@/components/style/style-guide-view'
// import InspirationSidebar from './shapes/inspiration-sidebar'


const InfiniteCanvas = () => {
  // Initialize ALL hooks at the top level in a consistent order
  const { theme, systemTheme } = useTheme()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const profile = useQuery(api.user.getCurrentUser)

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
  const isLight = (theme === 'system' ? systemTheme : theme) === 'light'

  const promptFromUrl = searchParams.get('prompt')
  const projectId = searchParams.get('project')
  const urlChatId = searchParams.get('chat')
  const imagesParam = searchParams.get('images')
  const initialImageIds: string[] = imagesParam
    ? JSON.parse(decodeURIComponent(imagesParam))
    : []

  // Check if shapes already exist from Convex load
  const existingShapes = useAppSelector((s) => s.shapes.shapes?.ids ?? [])

  // Project chats query & mutations
  const projectChats = useQuery(
    api.chat.listChats,
    projectId ? { projectId } : 'skip'
  ) ?? []
  const createChatMutation = useMutation(api.chat.createChat)
  const deleteChatMutation = useMutation(api.chat.deleteChat)
  const renameChatMutation = useMutation(api.chat.renameChat)
  const migrateInitialChatMutation = useMutation(api.chat.getOrMigrateInitialChat)

  // Instant local activeChatId state (initialized from URL)
  const [activeChatId, setActiveChatId] = useState<string | null>(urlChatId)
  const [deletedChatIds, setDeletedChatIds] = useState<Set<string>>(new Set())
  const pendingChatPromiseRef = useRef<Promise<string> | null>(null)
  const knownEmptyChatIdsRef = useRef<Set<string>>(new Set())

  // Optimistically filtered chats list (0ms instant removal on delete)
  const visibleChats = useMemo(() => {
    return projectChats.filter((c) => !deletedChatIds.has(c._id))
  }, [projectChats, deletedChatIds])

  useEffect(() => {
    setActiveChatId(urlChatId)
  }, [urlChatId])

  // Direct reactive Convex query for active chat turns (instant from memory cache)
  const isOptimisticNewChat = !!activeChatId?.startsWith('new-')
  const isKnownEmpty = activeChatId ? knownEmptyChatIdsRef.current.has(activeChatId) : false

  const dbTurnsRaw = useQuery(
    api.chat.getByChat,
    activeChatId && !isOptimisticNewChat ? { chatId: activeChatId } : 'skip'
  )

  const isLoadingTurns = !!activeChatId && !isOptimisticNewChat && !isKnownEmpty && dbTurnsRaw === undefined

  // Merged turns: reactive Convex turns + active streaming optimistic turns
  const turns = useMemo<ChatTurn[]>(() => {
    if (!activeChatId || isOptimisticNewChat) return []
    const dbFormatted: ChatTurn[] = (dbTurnsRaw ?? []).map((t) => ({
      id: t.turnId,
      prompt: t.prompt,
      response: t.response,
      isLoading: false,
      timestamp: t.timestamp,
      urls: t.urls ?? [],
      imageStorageIds: t.imageStorageIds ?? [],
    }))

    if (chat.chatTurns.length > 0) {
      const activeIds = new Set(chat.chatTurns.map((t) => t.id))
      return [
        ...dbFormatted.filter((t) => !activeIds.has(t.id)),
        ...chat.chatTurns,
      ].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
    }

    return dbFormatted
  }, [activeChatId, isOptimisticNewChat, dbTurnsRaw, chat.chatTurns])

  // Auto-migrate any unassigned turns created before multi-chat
  useEffect(() => {
    if (projectId) {
      migrateInitialChatMutation({ projectId }).catch(() => {})
    }
  }, [projectId, migrateInitialChatMutation])

  // Active chat title derived from projectChats
  const activeChatDoc = projectChats.find(c => c._id === activeChatId)
  const activeChatTitle = activeChatDoc?.title || 'New chat'

  // Sidebar open state
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Wire ChatInput to sendMessage
  const handleSend = async (msg: string, opts?: { urls?: string[]; imageStorageIds?: string[] }) => {
    if (!projectId) return

    let targetChatId = activeChatId
    let isFirstMessage = false

    // If activeChatId is an in-flight optimistic chat, await the creation promise
    if (targetChatId?.startsWith('new-') && pendingChatPromiseRef.current) {
      targetChatId = await pendingChatPromiseRef.current
      isFirstMessage = true
    } else if (!targetChatId) {
      try {
        targetChatId = await createChatMutation({ projectId, title: 'New chat' })
        knownEmptyChatIdsRef.current.add(targetChatId)
        setActiveChatId(targetChatId)
        const params = new URLSearchParams(searchParams.toString())
        params.set('chat', targetChatId)
        window.history.pushState(null, '', `${pathname}?${params.toString()}`)
        isFirstMessage = true
      } catch (e) {
        console.error('Failed to create chat on send', e)
        return
      }
    } else {
      if (turns.length === 0 && (!activeChatDoc?.title || activeChatDoc.title === 'New chat')) {
        isFirstMessage = true
      }
    }

    if (targetChatId) {
      knownEmptyChatIdsRef.current.delete(targetChatId)
    }

    // Send message bound to targetChatId
    chat.sendMessage(msg, projectId, { ...opts, chatId: targetChatId })

    // Auto-generate title ONLY on first message in background
    if (isFirstMessage && targetChatId) {
      const chatIdForTitle = targetChatId
      fetch('/api/chat/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: msg }),
      })
        .then((r) => r.json())
        .then(({ title }) => {
          if (title) {
            renameChatMutation({ chatId: chatIdForTitle as any, title }).catch(() => {})
          }
        })
        .catch((err) => console.error('Auto-title generation failed', err))
    }
  }

  // Handle creating a new chat thread (Instant Optimistic 0ms UI)
  const handleNewChat = () => {
    if (!projectId) return

    // 1. Set instant optimistic ID (0ms render)
    const optimisticId = `new-${Date.now()}`
    knownEmptyChatIdsRef.current.add(optimisticId)
    setActiveChatId(optimisticId)
    chat.setChatTurns([])

    // 2. Run creation in background and resolve
    const promise = createChatMutation({ projectId, title: 'New chat' })
      .then((realId) => {
        knownEmptyChatIdsRef.current.add(realId)
        setActiveChatId((current) => (current === optimisticId ? realId : current))
        const params = new URLSearchParams(searchParams.toString())
        params.set('chat', realId)
        window.history.pushState(null, '', `${pathname}?${params.toString()}`)
        return realId
      })
      .catch((e) => {
        console.error('Failed to create new chat', e)
        return optimisticId
      })

    pendingChatPromiseRef.current = promise
  }

  // Handle selecting an existing chat thread (Instant 0ms UI)
  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId)
    chat.setChatTurns([])
    const params = new URLSearchParams(searchParams.toString())
    params.set('chat', chatId)
    window.history.pushState(null, '', `${pathname}?${params.toString()}`)
  }

  // Handle returning back to chats list (Instant 0ms UI)
  const handleBackToList = () => {
    setActiveChatId(null)
    chat.setChatTurns([])
    const params = new URLSearchParams(searchParams.toString())
    params.delete('chat')
    window.history.pushState(null, '', `${pathname}?${params.toString()}`)
  }

  // Handle deleting a chat thread (Optimistic 0ms UI)
  const handleDeleteChat = (chatId: string) => {
    // 1. Immediately remove from visible list (0ms instant removal)
    setDeletedChatIds((prev) => new Set(prev).add(chatId))

    // 2. If user is currently looking at this deleted chat, instantly exit to list
    if (activeChatId === chatId) {
      handleBackToList()
    }

    // 3. Fire delete mutation in background (non-blocking)
    deleteChatMutation({ chatId: chatId as any }).catch((e) => {
      console.error('Failed to delete chat', e)
      // Revert if error
      setDeletedChatIds((prev) => {
        const next = new Set(prev)
        next.delete(chatId)
        return next
      })
    })
  }

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

  // Workspace tab state (Instant 0ms switching between Canvas and Style Guide)
  const [workspaceTab, setWorkspaceTab] = useState<'canvas' | 'styles'>('canvas')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWorkspaceTab(window.location.pathname.includes('style-guide') ? 'styles' : 'canvas')
    }
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab: 'canvas' | 'styles' }>
      if (customEvent.detail?.tab) {
        setWorkspaceTab(customEvent.detail.tab)
      }
    }
    const handlePopState = () => {
      setWorkspaceTab(window.location.pathname.includes('style-guide') ? 'styles' : 'canvas')
    }
    window.addEventListener('workspace-tab-change', handleTabChange)
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('workspace-tab-change', handleTabChange)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  return (
    <div className='fixed inset-0 flex flex-col'>
      {/* ── Style Guide View (Instant toggle) ── */}
      {workspaceTab === 'styles' && (
        <div className="absolute inset-0 z-30 bg-background overflow-y-auto">
          <StyleGuideView projectId={projectId} />
        </div>
      )}

      {/* ── Canvas View (kept mounted in memory) ── */}
      <div className={cn('relative w-full h-full flex flex-col', workspaceTab === 'styles' && 'invisible pointer-events-none')}>
        <TextSidebar isOpen={isSidebarOpen && hasSelectedText} />

      {/* ── ChatPanel ── */}
      <div
        className='fixed left-3 top-14 bottom-24 z-50 pointer-events-none'
        style={{
          width: sidebarOpen ? 296 : 40,
          transition: 'width 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div className={`pointer-events-auto flex flex-col ${sidebarOpen ? 'h-full' : ''}`}>
          <ChatPanel
            turns={turns}
            chats={visibleChats}
            activeChatId={activeChatId}
            activeChatTitle={activeChatTitle}
            isLoadingTurns={isLoadingTurns}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
            onBack={handleBackToList}
            profile={profile}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(o => !o)}
            toolStatus={chat.toolStatus}
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
            <DotParticleBackground isLight={isLight} />

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
    </div>
  )
}

export default InfiniteCanvas