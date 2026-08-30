'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MessageSquare, Trash2, Pencil } from 'lucide-react'
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
    onRenameChat?: (chatId: string, newTitle: string) => void
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

    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - 7)

    const groups: {
        today: ChatThreadItem[]
        yesterday: ChatThreadItem[]
        last7Days: ChatThreadItem[]
        older: ChatThreadItem[]
    } = {
        today: [],
        yesterday: [],
        last7Days: [],
        older: [],
    }

    for (const chat of chats) {
        const d = new Date(chat.updatedAt || chat.createdAt)
        const dStr = d.toDateString()

        if (dStr === todayStr) {
            groups.today.push(chat)
        } else if (dStr === yesterdayStr) {
            groups.yesterday.push(chat)
        } else if (d >= startOfWeek) {
            groups.last7Days.push(chat)
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
    onRenameChat,
    onCollapse,
}: Props) {
    const [editingChatId, setEditingChatId] = useState<string | null>(null)
    const [editTitle, setEditTitle] = useState<string>('')
    const editInputRef = useRef<HTMLInputElement>(null)

    const handleStartEdit = (e: React.MouseEvent, chat: ChatThreadItem) => {
        e.stopPropagation()
        setEditingChatId(chat._id)
        setEditTitle(chat.title || 'New chat')
        setTimeout(() => {
            if (editInputRef.current) {
                editInputRef.current.focus()
                editInputRef.current.select()
            }
        }, 30)
    }

    const handleSaveEdit = (chat: ChatThreadItem) => {
        const trimmed = editTitle.trim()
        if (trimmed && trimmed !== chat.title && onRenameChat) {
            onRenameChat(chat._id, trimmed)
        }
        setEditingChatId(null)
    }

    const groups = groupChatsByTime(chats)

    const renderChatGroup = (title: string, items: ChatThreadItem[]) => {
        if (items.length === 0) return null

        return (
            <div className="space-y-1">
                <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/70 px-2 py-1 select-none">
                    {title}
                </div>
                <div className="space-y-0.5">
                    <AnimatePresence initial={false}>
                        {items.map((chat) => {
                            const isActive = chat._id === activeChatId
                            const isEditing = chat._id === editingChatId

                            return (
                                <motion.div
                                    key={chat._id}
                                    layout
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
                                    onClick={() => onSelectChat(chat._id)}
                                    className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors select-none min-h-[34px] ${
                                        isActive
                                            ? 'bg-neutral-100 dark:bg-neutral-800 text-foreground font-medium'
                                            : 'text-foreground/75 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60 hover:text-foreground'
                                    }`}
                                >
                                    {isEditing ? (
                                        <div
                                            className="flex-1 pr-14 flex items-center"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <input
                                                ref={editInputRef}
                                                type="text"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        handleSaveEdit(chat)
                                                    } else if (e.key === 'Escape') {
                                                        e.preventDefault()
                                                        setEditingChatId(null)
                                                    }
                                                }}
                                                onBlur={() => handleSaveEdit(chat)}
                                                className="w-full bg-transparent border-0 border-b border-foreground/50 focus:border-foreground outline-none text-xs text-foreground font-medium py-0 px-0 rounded-none shadow-none"
                                                autoFocus
                                            />
                                        </div>
                                    ) : (
                                        <span className="truncate flex-1 pr-16">
                                            {chat.title || 'New chat'}
                                        </span>
                                    )}

                                    {/* Right-aligned slot: timestamp & action buttons cross-fade in place */}
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-end">
                                        <span className="text-[10px] text-muted-foreground/70 flex-shrink-0 transition-opacity duration-150 group-hover:opacity-0 pointer-events-none select-none">
                                            {formatChatTime(chat.updatedAt || chat.createdAt)}
                                        </span>

                                        {!isEditing && (
                                            <div className="absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto flex items-center gap-0.5">
                                                {onRenameChat && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleStartEdit(e, chat)}
                                                                className="flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                                            >
                                                                <Pencil className="w-3 h-3" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" sideOffset={6}>
                                                            Rename chat
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}

                                                {onDeleteChat && (
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
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
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
            <div className={`flex-1 overflow-y-auto px-2 py-3 ${chats.length === 0 ? 'flex items-center justify-center' : 'space-y-4'}`}>
                {chats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center px-6 py-4">
                        <p className="text-xs text-muted-foreground text-center leading-relaxed">
                            No chats yet. Start a new chat to begin exploring designs with Palm!
                        </p>
                    </div>
                ) : (
                    <>
                        {renderChatGroup('Today', groups.today)}
                        {renderChatGroup('Yesterday', groups.yesterday)}
                        {renderChatGroup('Last 7 days', groups.last7Days)}
                        {renderChatGroup('Older', groups.older)}
                    </>
                )}
            </div>
        </div>
    )
}
