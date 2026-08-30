'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ChatTurn } from '@/hooks/use-canvas'
import { ChatsList, ChatThreadItem } from './sidebar/chats-list'
import { ChatThread } from './sidebar/chat-thread'

interface Props {
    turns: ChatTurn[]
    chats?: ChatThreadItem[]
    activeChatId?: string | null
    activeChatTitle?: string
    isLoadingTurns?: boolean
    isSending?: boolean
    onSelectChat?: (chatId: string) => void
    onNewChat?: () => void
    onDeleteChat?: (chatId: string) => void
    onRenameChat?: (chatId: string, newTitle: string) => void
    onBack?: () => void
    profile?: { name?: string; image?: string | null } | null
    isOpen: boolean
    onToggle: () => void
    toolStatus?: { label: string; state: 'running' | 'done' } | null
}

export function ChatPanel({
    turns,
    chats = [],
    activeChatId = null,
    activeChatTitle = 'New chat',
    isLoadingTurns = false,
    isSending = false,
    onSelectChat,
    onNewChat,
    onDeleteChat,
    onRenameChat,
    onBack,
    profile,
    isOpen,
    onToggle,
    toolStatus,
}: Props) {
    // View is strictly driven by whether there is an activeChatId
    const view: 'list' | 'thread' = activeChatId ? 'thread' : 'list'

    return (
        <AnimatePresence initial={false} mode="popLayout">
            {!isOpen ? (
                <motion.div
                    key="chat-trigger-btn"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.1 } }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="origin-top-left"
                >
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={onToggle}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 bg-white/90 dark:border-white/10 dark:bg-neutral-900/90 shadow-md backdrop-blur-md text-xs font-medium text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Chats</span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                            Open chats
                        </TooltipContent>
                    </Tooltip>
                </motion.div>
            ) : (
                <motion.div
                    key="chat-panel-container"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{
                        opacity: 0,
                        scale: 0.95,
                        transition: { duration: 0.18, ease: 'easeIn' }
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: 560,
                        damping: 32,
                        mass: 0.45,
                    }}
                    className="relative flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900 h-full w-[296px] shadow-lg dark:shadow-2xl origin-top-left"
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {view === 'list' ? (
                            <motion.div
                                key="chats-list"
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -8 }}
                                transition={{ duration: 0.16, ease: 'easeOut' }}
                                className="absolute inset-0 flex flex-col"
                            >
                                <ChatsList
                                    chats={chats}
                                    activeChatId={activeChatId}
                                    onSelectChat={(id) => onSelectChat?.(id)}
                                    onNewChat={() => onNewChat?.()}
                                    onDeleteChat={onDeleteChat}
                                    onRenameChat={onRenameChat}
                                    onCollapse={onToggle}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="chat-thread"
                                initial={{ opacity: 0, x: 8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 8 }}
                                transition={{ duration: 0.16, ease: 'easeOut' }}
                                className="absolute inset-0 flex flex-col"
                            >
                                <ChatThread
                                    turns={turns}
                                    activeChatTitle={activeChatTitle}
                                    isLoading={isLoadingTurns}
                                    isSending={isSending}
                                    onBack={() => onBack?.()}
                                    onCollapse={onToggle}
                                    profile={profile}
                                    toolStatus={toolStatus}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
export default ChatPanel