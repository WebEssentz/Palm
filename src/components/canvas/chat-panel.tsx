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
    onSelectChat?: (chatId: string) => void
    onNewChat?: () => void
    onDeleteChat?: (chatId: string) => void
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
    onSelectChat,
    onNewChat,
    onDeleteChat,
    onBack,
    profile,
    isOpen,
    onToggle,
    toolStatus,
}: Props) {
    // View is strictly driven by whether there is an activeChatId
    const view: 'list' | 'thread' = activeChatId ? 'thread' : 'list'

    // If collapsed, render the compact square icon trigger
    if (!isOpen) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={onToggle}
                        className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-black/75 dark:text-white/75 hover:text-black dark:hover:text-white"
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                    Open sidebar
                </TooltipContent>
            </Tooltip>
        )
    }

    return (
        <div className="relative flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900 h-full shadow-sm">
            <AnimatePresence mode="wait" initial={false}>
                {view === 'list' ? (
                    <motion.div
                        key="chats-list"
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="absolute inset-0 flex flex-col"
                    >
                        <ChatsList
                            chats={chats}
                            activeChatId={activeChatId}
                            onSelectChat={(id) => onSelectChat?.(id)}
                            onNewChat={() => onNewChat?.()}
                            onDeleteChat={onDeleteChat}
                            onCollapse={onToggle}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="chat-thread"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="absolute inset-0 flex flex-col"
                    >
                        <ChatThread
                            turns={turns}
                            activeChatTitle={activeChatTitle}
                            isLoading={isLoadingTurns}
                            onBack={() => onBack?.()}
                            onCollapse={onToggle}
                            profile={profile}
                            toolStatus={toolStatus}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
export default ChatPanel