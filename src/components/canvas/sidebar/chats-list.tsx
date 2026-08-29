'use client'

import React from 'react'
import { Plus, MessageSquare, Trash2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Id } from '../../../../convex/_generated/dataModel'

export interface ChatThreadItem {
    _id: string
    projectId: string
    title: string
    createdAt: number
    updatedAt: number
}

interface Props {
    chats: ChatThreadItem[]
    activeChatId: string | null
    onSelectChat: (chatId: string) => void
    onNewChat: () => void
    onDeleteChat?: (chatId: string) => void
    onCollapse: () => void
}

function formatChatTime(timestamp: number): string {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const isYesterday = date.toDateString() === yesterday.toDateString()

    if (isYesterday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function groupChatsByTime(chats: ChatThreadItem[]) {
    const now = new Date()
    const todayStr = now.toDateString()

    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const yesterdayStr = yesterday.toDateString()

    const groups: {
        today: ChatThreadItem[]
        yesterday: ChatThreadItem[]
        older: ChatThreadItem[]
    } = {
        today: [],
        yesterday: [],
        older: [],
    }

    for (const chat of chats) {
        const chatDate = new Date(chat.updatedAt || chat.createdAt).toDateString()
        if (chatDate === todayStr) {
            groups.today.push(chat)
        } else if (chatDate === yesterdayStr) {
            groups.yesterday.push(chat)
        } else {
            groups.older.push(chat)
        }
    }

    return groups
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

export function ChatsList({
    chats,
    activeChatId,
    onSelectChat,
    onNewChat,
    onDeleteChat,
    onCollapse,
}: Props) {
    const groups = groupChatsByTime(chats)

    const renderChatGroup = (title: string, items: ChatThreadItem[]) => {
        if (items.length === 0) return null

        return (
            <div className="space-y-1">
                <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/70 px-2 py-1 select-none">
                    {title}
                </div>
                <div className="space-y-0.5">
                    {items.map((chat) => {
                        const isActive = chat._id === activeChatId
                        return (
                            <div
                                key={chat._id}
                                onClick={() => onSelectChat(chat._id)}
                                className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors select-none min-h-[34px] ${
                                    isActive
                                        ? 'bg-neutral-100 dark:bg-neutral-800 text-foreground font-medium'
                                        : 'text-foreground/75 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60 hover:text-foreground'
                                }`}
                            >
                                <span className="truncate flex-1 pr-14">
                                    {chat.title || 'New chat'}
                                </span>

                                {/* Right-aligned slot: timestamp & delete button cross-fade in place */}
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-end">
                                    <span className="text-[10px] text-muted-foreground/70 flex-shrink-0 transition-opacity duration-150 group-hover:opacity-0 pointer-events-none select-none">
                                        {formatChatTime(chat.updatedAt || chat.createdAt)}
                                    </span>

                                    {onDeleteChat && (
                                        <div className="absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onDeleteChat(chat._id)
                                                        }}
                                                        className="flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground/70 hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" sideOffset={8}>
                                                    Delete chat
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header: + New Chat & Collapse */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-black/5 dark:border-white/5">
                <button
                    type="button"
                    onClick={onNewChat}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 transition-colors text-xs font-medium text-foreground cursor-pointer shadow-2xs"
                >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New chat</span>
                </button>

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

            {/* Body: Grouped List */}
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
                {chats.length === 0 ? (
                    <div className="text-center py-10 px-4 text-xs text-muted-foreground">
                        No chats yet. Start a new chat to begin exploring designs with Palm!
                    </div>
                ) : (
                    <>
                        {renderChatGroup('Today', groups.today)}
                        {renderChatGroup('Yesterday', groups.yesterday)}
                        {renderChatGroup('Older', groups.older)}
                    </>
                )}
            </div>
        </div>
    )
}
