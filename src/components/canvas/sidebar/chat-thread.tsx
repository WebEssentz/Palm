'use client'

import React, { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { ArrowLeft, Copy, Check, Globe, MessageSquare } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ChatTurn } from '@/hooks/use-canvas'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import ReactMarkdown from 'react-markdown'
import { ToolStatusBubble } from '../ToolStatusBubble'

interface Props {
    turns: ChatTurn[]
    activeChatTitle?: string
    isLoading?: boolean
    onBack: () => void
    onCollapse: () => void
    profile?: { name?: string; image?: string | null } | null
    toolStatus?: { label: string; state: 'running' | 'done' } | null
}

function StreamingDot({ isLight }: { isLight: boolean }) {
    return (
        <div className='flex items-center pt-0.5'>
            <motion.div
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: isLight
                        ? 'rgba(10,10,10,0.75)'
                        : 'rgba(255,255,255,0.85)',
                    flexShrink: 0,
                }}
                animate={{
                    scale: [1, 1.35, 1],
                    opacity: [0.55, 1, 0.55],
                }}
                transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: [0.4, 0, 0.6, 1],
                }}
            />
        </div>
    )
}

function MenuDotIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="3" cy="4.5" r="0.75" fill="currentColor" stroke="none" />
            <line x1="6.5" y1="4.5" x2="13.5" y2="4.5" />
            <circle cx="3" cy="8" r="0.75" fill="currentColor" stroke="none" />
            <line x1="6.5" y1="8" x2="13.5" y2="8" />
            <circle cx="3" cy="11.5" r="0.75" fill="currentColor" stroke="none" />
            <line x1="6.5" y1="11.5" x2="13.5" y2="11.5" />
        </svg>
    )
}

function formatMessageTime(timestamp?: number): string {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
}

let activeScrollRaf: number | null = null

function animateScrollToBottom(element: HTMLElement, duration = 850, retryCount = 3) {
    if (activeScrollRaf) {
        cancelAnimationFrame(activeScrollRaf)
    }

    const start = element.scrollTop
    const target = Math.max(0, element.scrollHeight - element.clientHeight)
    const distance = target - start

    if (distance <= 5) {
        // If content height hasn't settled yet, retry up to retryCount times
        if (retryCount > 0) {
            setTimeout(() => {
                animateScrollToBottom(element, duration, retryCount - 1)
            }, 100)
        }
        return
    }

    const startTime = performance.now()

    function step(now: number) {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        // easeInOutCubic: smooth acceleration and deceleration
        const ease = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2

        element.scrollTop = start + distance * ease

        if (progress < 1) {
            activeScrollRaf = requestAnimationFrame(step)
        } else {
            element.scrollTop = target
            activeScrollRaf = null
        }
    }

    activeScrollRaf = requestAnimationFrame(step)
}

function smoothScrollTo(element: HTMLElement, targetTop: number, duration = 380) {
    if (activeScrollRaf) {
        cancelAnimationFrame(activeScrollRaf)
    }

    const start = element.scrollTop
    const distance = targetTop - start
    if (Math.abs(distance) <= 2) return

    const startTime = performance.now()

    function step(now: number) {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        // easeOutCubic: snappy deceleration
        const ease = 1 - Math.pow(1 - progress, 3)

        element.scrollTop = start + distance * ease

        if (progress < 1) {
            activeScrollRaf = requestAnimationFrame(step)
        } else {
            element.scrollTop = targetTop
            activeScrollRaf = null
        }
    }

    activeScrollRaf = requestAnimationFrame(step)
}

export function ChatThread({
    turns,
    activeChatTitle,
    isLoading = false,
    onBack,
    onCollapse,
    profile,
    toolStatus,
}: Props) {
    const { theme, systemTheme } = useTheme()
    const isLight = (theme === 'system' ? systemTheme : theme) === 'light'
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [bottomPadding, setBottomPadding] = useState<number>(0)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const innerContentRef = useRef<HTMLDivElement>(null)
    const lastAnchoredTurnIdRef = useRef<string | null>(null)
    const prevTurnsLengthRef = useRef<number>(turns.length)
    const hasInitialScrolledRef = useRef<boolean>(false)

    const latestTurn = turns[turns.length - 1]
    const latestTurnId = latestTurn?.id
    const isLatestTurnLoading = latestTurn?.isLoading

    // Adaptive padding calculation: keeps the latest turn anchored without dropping
    const updateAdaptivePadding = () => {
        if (!scrollContainerRef.current || !latestTurnId) return
        const container = scrollContainerRef.current
        const turnEl = document.getElementById(`chat-turn-${latestTurnId}`)
        if (!turnEl) return

        const containerHeight = container.clientHeight
        const turnHeight = turnEl.offsetHeight

        // Runway needed so latest turn can sit right at top of viewport
        const runway = Math.max(0, containerHeight - turnHeight - 28)
        setBottomPadding(runway)
    }

    // Trigger autoscroll to bottom when entering an existing chat
    const triggerEntryScroll = () => {
        if (!scrollContainerRef.current || hasInitialScrolledRef.current) return
        hasInitialScrolledRef.current = true
        setTimeout(() => {
            if (scrollContainerRef.current) {
                animateScrollToBottom(scrollContainerRef.current, 850)
            }
        }, 60)
    }

    // Reset when switching chats
    const firstTurnId = turns[0]?.id || ''
    const activeChatKey = activeChatTitle || ''
    useEffect(() => {
        hasInitialScrolledRef.current = false
        lastAnchoredTurnIdRef.current = null
        prevTurnsLengthRef.current = turns.length
        setBottomPadding(0)
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0
        }
    }, [activeChatKey, firstTurnId])

    // Watch DOM height on initial load to scroll to bottom when entering chat
    const chatKey = turns.map((t) => t.id).join('-')
    useEffect(() => {
        if (!innerContentRef.current || isLoading || turns.length === 0) return
        if (isLatestTurnLoading) return // Don't trigger entry bottom scroll if we are actively sending a new message

        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.height > 50) {
                    triggerEntryScroll()
                }
            }
        })

        ro.observe(innerContentRef.current)
        return () => ro.disconnect()
    }, [isLoading, chatKey, isLatestTurnLoading])

    // Dynamic prompt anchoring when a user sends a NEW message
    useEffect(() => {
        if (!scrollContainerRef.current || !latestTurn) return

        const isNewTurn = latestTurn.id !== lastAnchoredTurnIdRef.current && (latestTurn.isLoading || turns.length > prevTurnsLengthRef.current)
        prevTurnsLengthRef.current = turns.length

        if (isNewTurn) {
            hasInitialScrolledRef.current = true // Disable entry scroll so prompt anchoring takes priority
            lastAnchoredTurnIdRef.current = latestTurn.id

            // Measure initial runway after DOM paint
            requestAnimationFrame(() => {
                const container = scrollContainerRef.current
                if (!container) return

                const turnEl = document.getElementById(`chat-turn-${latestTurn.id}`)
                if (!turnEl) return

                const userBubble = turnEl.querySelector('.user-bubble') as HTMLElement | null
                const promptHeight = userBubble ? userBubble.offsetHeight : turnEl.offsetHeight
                const containerHeight = container.clientHeight

                // Initial runway for prompt
                const runway = Math.max(0, containerHeight - promptHeight - 28)
                setBottomPadding(runway)

                // Smoothly scroll the container so this turn aligns right at the top
                requestAnimationFrame(() => {
                    if (!scrollContainerRef.current) return
                    const targetTop = Math.max(0, turnEl.offsetTop - 12)
                    smoothScrollTo(scrollContainerRef.current, targetTop, 380)
                })
            })
        }
    }, [latestTurn?.id, latestTurn?.isLoading, turns.length])

    // Dynamically adapt padding as AI response streams or completes (never drops!)
    useEffect(() => {
        if (!latestTurnId) return
        const turnEl = document.getElementById(`chat-turn-${latestTurnId}`)
        if (!turnEl) return

        const ro = new ResizeObserver(() => {
            updateAdaptivePadding()

            // If response becomes taller than viewport while streaming, follow the bottom so newest tokens are visible
            if (isLatestTurnLoading && scrollContainerRef.current) {
                const container = scrollContainerRef.current
                const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 140
                if (isNearBottom && turnEl.offsetHeight > container.clientHeight) {
                    container.scrollTop = container.scrollHeight
                }
            }
        })

        ro.observe(turnEl)
        return () => ro.disconnect()
    }, [latestTurnId, isLatestTurnLoading])

    const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
        e.stopPropagation()
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 1500)
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header: ← Back to Chats + Title + Collapse */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-black/5 dark:border-white/5 min-h-[48px]">
                {/* Left: Navigator */}
                <div className="w-[74px] flex items-center justify-start flex-shrink-0">
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 transition-colors text-xs font-medium text-foreground cursor-pointer shadow-2xs"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Chats</span>
                    </button>
                </div>

                {/* Center: Title strictly centered between navigator and close icon */}
                <div className="flex-1 min-w-0 px-3 text-center">
                    <p className="truncate text-xs font-medium text-muted-foreground select-none">
                        {activeChatTitle || 'Chat'}
                    </p>
                </div>

                {/* Right: Close Icon */}
                <div className="w-[74px] flex items-center justify-end flex-shrink-0">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={onCollapse}
                                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
                            >
                                <MenuDotIcon className="w-4 h-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={6}>
                            Close sidebar
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {/* Scrollable Stream of All Turns */}
            <div
                ref={scrollContainerRef}
                className="chat-scroll px-3 py-4 flex flex-col gap-5 overflow-y-auto flex-1 min-h-0"
            >
                <AnimatePresence mode="wait" initial={false}>
                    {isLoading ? (
                        <motion.div
                            key="loading-thread"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            className="flex-1 flex flex-col items-center justify-center gap-2.5 px-6"
                        >
                            <div className="w-4 h-4 border-2 border-black/15 dark:border-white/15 border-t-black dark:border-t-white rounded-full animate-spin" />
                        </motion.div>
                    ) : turns.length === 0 ? (
                        <motion.div
                            key="empty-thread"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex items-center justify-center px-6"
                        >
                            <p className="text-xs text-muted-foreground text-center leading-relaxed">
                                Ask Palm to design frames, generate components, or update layouts on your canvas.
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            ref={innerContentRef}
                            key="turns-stream"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onAnimationComplete={triggerEntryScroll}
                            style={{
                                paddingBottom: bottomPadding,
                                transition: 'padding-bottom 0.25s ease',
                            }}
                            className="flex flex-col gap-5"
                        >
                            {turns.map((turn, index) => {
                                const turnUrls = turn.urls ?? []
                                const isLatest = index === turns.length - 1

                                return (
                                    <motion.div
                                        key={turn.id}
                                        id={`chat-turn-${turn.id}`}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.22, ease: 'easeOut' }}
                                        className="flex flex-col gap-3"
                                    >
                                        {/* ── User bubble ── */}
                                        <div className="user-bubble rounded-2xl overflow-hidden border border-black/10 bg-neutral-100 dark:border-white/10 dark:bg-neutral-800/80 p-3">
                                            <div className="flex items-start gap-2.5">
                                                <Avatar className="size-5 flex-shrink-0 mt-0.5">
                                                    <AvatarImage src={profile?.image || ''} alt={profile?.name} />
                                                    <AvatarFallback className="text-[10px] font-semibold bg-orange-500 text-white">
                                                        {profile?.name?.[0]?.toUpperCase() ?? 'U'}
                                                    </AvatarFallback>
                                                </Avatar>

                                                <div className="flex-1 min-w-0 space-y-1.5">
                                                    <p className="text-xs text-foreground font-normal leading-relaxed break-words whitespace-pre-wrap">
                                                        {turn.prompt}
                                                    </p>

                                                    {/* Attached URLs */}
                                                    {turnUrls.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 pt-1">
                                                            {turnUrls.map((url) => (
                                                                <a
                                                                    key={url}
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="flex items-center gap-1 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-700/60 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                                                >
                                                                    <Globe className="w-2.5 h-2.5" />
                                                                    <span className="truncate max-w-[140px]">{url}</span>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Uploaded Images */}
                                                    {turn.imageStorageIds && turn.imageStorageIds.length > 0 && (
                                                        <div className="flex gap-1.5 pt-1">
                                                            {turn.imageStorageIds.map((id) => (
                                                                <div
                                                                    key={id}
                                                                    className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-200 dark:bg-neutral-700 border border-black/5"
                                                                >
                                                                    <img
                                                                        src={`/api/storage/${id}`}
                                                                        alt="reference"
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── AI response ── */}
                                        <div className="space-y-2 px-1">
                                            {/* Tool Status */}
                                            <AnimatePresence>
                                                {isLatest && toolStatus && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="pt-0.5 overflow-hidden"
                                                    >
                                                        <ToolStatusBubble
                                                            label={toolStatus.label}
                                                            state={toolStatus.state}
                                                            isLight={isLight}
                                                        />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Markdown Content vs StreamingDot */}
                                            <AnimatePresence mode="wait">
                                                {turn.response ? (
                                                    <motion.div
                                                        key={`response-${turn.id}`}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="prose prose-xs dark:prose-invert max-w-none text-xs text-foreground/90 leading-relaxed break-words [&>p]:mb-2 [&>ul]:my-1.5 [&>ol]:my-1.5 [&>li]:my-0.5 [&_pre]:p-2.5 [&_pre]:rounded-xl [&_pre]:bg-neutral-100 dark:[&_pre]:bg-neutral-800 [&_code]:text-[11px]"
                                                    >
                                                        <ReactMarkdown>{turn.response}</ReactMarkdown>
                                                    </motion.div>
                                                ) : (
                                                    turn.isLoading && (
                                                        <motion.div
                                                            key={`loading-${turn.id}`}
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            transition={{ duration: 0.15 }}
                                                        >
                                                            <StreamingDot isLight={isLight} />
                                                        </motion.div>
                                                    )
                                                )}
                                            </AnimatePresence>

                                            {/* Footer with Timestamp on Left & Copy Button on Right */}
                                            {turn.response && (
                                                <div className="flex items-center justify-between pt-1">
                                                    <span className="text-[10px] text-muted-foreground/50 select-none pl-0.5">
                                                        {formatMessageTime(turn.timestamp)}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleCopy(e, turn.response, turn.id)}
                                                        className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                                        title="Copy response"
                                                    >
                                                        <AnimatePresence mode="wait" initial={false}>
                                                            {copiedId === turn.id ? (
                                                                <motion.div
                                                                    key="check"
                                                                    initial={{ scale: 0.6, opacity: 0 }}
                                                                    animate={{ scale: 1, opacity: 1 }}
                                                                    exit={{ scale: 0.6, opacity: 0 }}
                                                                    transition={{ duration: 0.15 }}
                                                                >
                                                                    <Check className="w-3 h-3 text-green-500" />
                                                                </motion.div>
                                                            ) : (
                                                                <motion.div
                                                                    key="copy"
                                                                    initial={{ scale: 0.6, opacity: 0 }}
                                                                    animate={{ scale: 1, opacity: 1 }}
                                                                    exit={{ scale: 0.6, opacity: 0 }}
                                                                    transition={{ duration: 0.15 }}
                                                                >
                                                                    <Copy className="w-3 h-3" />
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

export default ChatThread
