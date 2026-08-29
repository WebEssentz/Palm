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
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom on incoming turns or turn updates
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [turns, turns.map((t) => t.response).join('')])

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
                            key="turns-stream"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col gap-5"
                        >
                            {turns.map((turn, index) => {
                                const turnUrls = turn.urls ?? []
                                const isLatest = index === turns.length - 1

                                return (
                                    <motion.div
                                        key={turn.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.22, ease: 'easeOut' }}
                                        className="flex flex-col gap-3"
                                    >
                                        {/* ── User bubble ── */}
                                        <div className="rounded-2xl overflow-hidden border border-black/10 bg-neutral-100 dark:border-white/10 dark:bg-neutral-800/80 p-3">
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

                                            {/* Copy Button */}
                                            {turn.response && (
                                                <div className="flex justify-end pt-0.5">
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
                <div ref={messagesEndRef} />
            </div>
        </div>
    )
}

export default ChatThread
