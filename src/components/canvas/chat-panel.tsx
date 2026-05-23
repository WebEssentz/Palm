'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { ChevronDown, ChevronUp, Copy, Globe } from 'lucide-react'
import { ChatTurn } from '@/hooks/use-canvas'
import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import ReactMarkdown from 'react-markdown'

interface Props {
    turns: ChatTurn[]
    expandedTurnId: string | null
    onExpandTurn: (id: string | null) => void
    profile?: { name: string; image?: string | null }
}

// ── Pulsing glass dot — shown while loading with no text yet ──
function StreamingDot({ isLight }: { isLight: boolean }) {
    return (
        <div className='flex items-center pt-0.5'>
            <motion.div
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    // Glass dot: dark on light, white on dark
                    background: isLight
                        ? 'rgba(10,10,10,0.75)'
                        : 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    boxShadow: isLight
                        ? '0 0 0 2px rgba(10,10,10,0.08), 0 1px 3px rgba(0,0,0,0.18)'
                        : '0 0 0 2px rgba(255,255,255,0.12), 0 1px 3px rgba(0,0,0,0.40)',
                    flexShrink: 0,
                }}
                animate={{
                    scale: [1, 1.35, 1],
                    opacity: [0.55, 1, 0.55],
                    boxShadow: isLight
                        ? [
                              '0 0 0 2px rgba(10,10,10,0.08), 0 1px 3px rgba(0,0,0,0.18)',
                              '0 0 0 4px rgba(10,10,10,0.06), 0 2px 8px rgba(0,0,0,0.22)',
                              '0 0 0 2px rgba(10,10,10,0.08), 0 1px 3px rgba(0,0,0,0.18)',
                          ]
                        : [
                              '0 0 0 2px rgba(255,255,255,0.12), 0 1px 3px rgba(0,0,0,0.40)',
                              '0 0 0 5px rgba(255,255,255,0.07), 0 2px 10px rgba(255,255,255,0.10)',
                              '0 0 0 2px rgba(255,255,255,0.12), 0 1px 3px rgba(0,0,0,0.40)',
                          ],
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

export function ChatPanel({ turns, expandedTurnId, onExpandTurn, profile }: Props) {
    const { theme, systemTheme } = useTheme()
    const isLight = (theme === 'system' ? systemTheme : theme) === 'light'
    const [open, setOpen] = useState(true)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
        e.stopPropagation()
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 1500)
    }

    const glass: React.CSSProperties = isLight ? {
        background: 'rgba(250,246,238,0.96)',
        backdropFilter: 'blur(32px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
        border: '1px solid rgba(120,96,60,0.14)',
        boxShadow: [
            '0 0 0 0.5px rgba(100,76,40,0.08)',
            '0 8px 32px rgba(80,60,30,0.18)',
            '0 2px 8px rgba(80,60,30,0.10)',
            'inset 0 1px 0 rgba(255,255,255,0.95)',
        ].join(', '),
    } : {
        background: 'rgba(18,18,18,0.92)',
        backdropFilter: 'blur(32px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: [
            '0 0 0 0.5px rgba(255,255,255,0.04)',
            '0 8px 32px rgba(0,0,0,0.50)',
            '0 2px 8px rgba(0,0,0,0.30)',
            'inset 0 1px 0 rgba(255,255,255,0.08)',
        ].join(', '),
    }

    const chipGlass: React.CSSProperties = isLight ? {
        background: 'rgba(240,235,225,0.80)',
        border: '1px solid rgba(120,96,60,0.10)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.80)',
    } : {
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
    }

    const urlPill: React.CSSProperties = isLight ? {
        background: 'rgba(230,225,215,0.70)',
        border: '1px solid rgba(120,96,60,0.10)',
        borderRadius: 999,
    } : {
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 999,
    }

    const iconBtn: React.CSSProperties = isLight ? {
        background: 'rgba(230,225,215,0.70)',
        border: '1px solid rgba(120,96,60,0.10)',
        borderRadius: 8,
    } : {
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
    }

    const scrollbarStyle = `
        .chat-scroll::-webkit-scrollbar { width: 3px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb {
            background: ${isLight ? 'rgba(120,96,60,0.18)' : 'rgba(255,255,255,0.12)'};
            border-radius: 99px;
            backdrop-filter: blur(4px);
        }
        .chat-scroll::-webkit-scrollbar-thumb:hover {
            background: ${isLight ? 'rgba(120,96,60,0.32)' : 'rgba(255,255,255,0.22)'};
        }
    `

    return (
        <>
            <style>{scrollbarStyle}</style>
            <div
                onClick={!open ? () => setOpen(true) : undefined}
                className='fixed left-3 top-14 z-50 overflow-hidden'
                style={{
                    ...glass,
                    borderRadius: 20,
                    width: open ? 296 : 72,
                    cursor: open ? 'default' : 'pointer',
                    transition: 'width 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
                }}
            >
                {/* Specular rim */}
                <div
                    className='pointer-events-none absolute inset-x-0 top-0 h-[1px] z-10'
                    style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.90) 50%, transparent 90%)' }}
                />

                {/* ── Dots pill ── */}
                <div className={`flex items-center ${open ? 'p-2.5' : 'p-0 h-10 justify-center'}`}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
                        className={`flex items-center justify-center gap-[3px] flex-shrink-0 cursor-pointer ${open ? 'w-8 h-8 rounded-xl' : 'w-full h-full'}`}
                        style={open ? chipGlass : {}}
                    >
                        {[0, 1, 2].map(i => (
                            <div key={i} className='w-[3px] h-[3px] rounded-full bg-foreground/50' />
                        ))}
                    </button>
                </div>

                {/* ── Body ── */}
                {open && (
                    <div
                        className='chat-scroll px-3 pb-3 pt-1 flex flex-col gap-3 overflow-y-auto'
                        style={{ maxHeight: '65vh' }}
                    >
                        {turns.map((turn) => {
                            const isExpanded = expandedTurnId === turn.id
                            const turnUrls = turn.urls ?? []

                            return (
                                <div key={turn.id} className='flex flex-col'>

                                    {/* ── User bubble ── */}
                                    <div className='rounded-2xl overflow-hidden' style={chipGlass}>
                                        {!isExpanded && (
                                            <button
                                                onClick={() => onExpandTurn(turn.id)}
                                                className='w-full text-left px-3 py-2.5 cursor-pointer group'
                                            >
                                                <div className='flex items-center gap-2'>
                                                    <Avatar className='size-5 flex-shrink-0'>
                                                        <AvatarImage src={profile?.image || ''} alt={profile?.name} />
                                                        <AvatarFallback className='text-[10px] font-semibold bg-orange-500 text-white'>
                                                            {profile?.name?.[0]?.toUpperCase() ?? 'U'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <p className='text-xs text-foreground/65 group-hover:text-foreground/90 transition-colors truncate flex-1'>
                                                        {turn.prompt}
                                                    </p>
                                                    <ChevronDown className='w-3.5 h-3.5 text-foreground/35 group-hover:text-foreground/60 transition-colors flex-shrink-0' />
                                                </div>
                                            </button>
                                        )}

                                        {isExpanded && (
                                            <div className='px-3 pt-3 pb-2.5 flex flex-col gap-2'>
                                                <div className='flex items-start gap-2'>
                                                    <Avatar className='size-5 flex-shrink-0 mt-0.5'>
                                                        <AvatarImage src={profile?.image || ''} alt={profile?.name} />
                                                        <AvatarFallback className='text-[10px] font-semibold bg-orange-500 text-white'>
                                                            {profile?.name?.[0]?.toUpperCase() ?? 'U'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <p
                                                        className='text-xs text-foreground/80 leading-relaxed flex-1'
                                                        style={{
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden',
                                                        }}
                                                    >
                                                        {turn.prompt}
                                                    </p>
                                                </div>

                                                <div className='flex items-center gap-1.5'>
                                                    {turnUrls.length > 0 && (
                                                        <div className='flex items-center gap-1.5 px-2 py-1 flex-1 min-w-0' style={urlPill}>
                                                            <Globe className='w-3 h-3 text-foreground/40 flex-shrink-0' />
                                                            <span className='text-[11px] text-foreground/55 truncate'>
                                                                {turnUrls[0].replace(/^https?:\/\//, '')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className='flex items-center gap-1 ml-auto'>
                                                        <button
                                                            onClick={(e) => handleCopy(e, turn.prompt, turn.id)}
                                                            className='w-6 h-6 flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity'
                                                            style={iconBtn}
                                                        >
                                                            <Copy className='w-3 h-3 text-foreground/50' />
                                                        </button>
                                                        <button
                                                            onClick={() => onExpandTurn(null)}
                                                            className='w-6 h-6 flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity'
                                                            style={iconBtn}
                                                        >
                                                            <ChevronUp className='w-3 h-3 text-foreground/50' />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Gap between bubble and AI response ── */}
                                    <div className='h-6' />

                                    {/* ── AI response ── */}
                                    <div className='px-1'>
                                        <AnimatePresence mode='wait'>
                                            {turn.isLoading && !turn.response ? (
                                                // Single pulsing glass dot while waiting for first token
                                                <motion.div
                                                    key='dot'
                                                    initial={{ opacity: 0, scale: 0.6 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.6 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <StreamingDot isLight={isLight} />
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key='text'
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.15 }}
                                                    className='text-xs text-foreground/55 leading-relaxed min-w-0'
                                                >
                                                    <ReactMarkdown
                                                        components={{
                                                            p: ({ children }) => (
                                                                <p className='mb-1.5 last:mb-0'>{children}</p>
                                                            ),
                                                            strong: ({ children }) => (
                                                                <strong className='font-semibold text-foreground/75'>{children}</strong>
                                                            ),
                                                            ul: ({ children }) => (
                                                                <ul className='mt-1.5 flex flex-col gap-1'>{children}</ul>
                                                            ),
                                                            li: ({ children }) => (
                                                                <li className='flex gap-1.5 items-start'>
                                                                    <span className='mt-1.5 w-1 h-1 rounded-full flex-shrink-0' style={{ background: '#A07850', opacity: 0.6 }} />
                                                                    <span>{children}</span>
                                                                </li>
                                                            ),
                                                        }}
                                                    >
                                                        {turn.response}
                                                    </ReactMarkdown>

                                                    {/* Glass dot while still streaming text */}
                                                    {turn.isLoading && (
                                                        <div className='mt-1.5'>
                                                            <StreamingDot isLight={isLight} />
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </>
    )
}