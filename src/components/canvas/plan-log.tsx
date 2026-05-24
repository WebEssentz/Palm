'use client'

import React from 'react'
import { useTheme } from 'next-themes'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChatTurn } from '@/hooks/use-canvas'
import { cn } from '@/lib/utils'

interface Props {
    turns: ChatTurn[]
    selectedTurnId: string | null
    onSelectTurn: (id: string) => void
    isOpen: boolean
    onToggle: () => void
}

export function PlanLog({ turns, selectedTurnId, onSelectTurn, isOpen, onToggle }: Props) {
    const { theme, systemTheme } = useTheme()
    const isLight = (theme === 'system' ? systemTheme : theme) === 'light'

    const glass: React.CSSProperties = isLight ? {
        background: 'rgba(250,246,238,0.96)',
        backdropFilter: 'blur(32px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
        border: '1px solid rgba(120,96,60,0.14)',
        boxShadow: [
            '0 0 0 0.5px rgba(100,76,40,0.08)',
            '0 4px 16px rgba(80,60,30,0.12)',
            'inset 0 1px 0 rgba(255,255,255,0.95)',
        ].join(', '),
    } : {
        background: 'rgba(18,18,18,0.92)',
        backdropFilter: 'blur(32px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: [
            '0 0 0 0.5px rgba(255,255,255,0.04)',
            '0 4px 16px rgba(0,0,0,0.40)',
            'inset 0 1px 0 rgba(255,255,255,0.08)',
        ].join(', '),
    }

    return (
        <div className='relative flex-shrink-0' style={{ ...glass, borderRadius: 20, overflow: 'hidden' }}>
            <div
                className='pointer-events-none absolute inset-x-0 top-0 h-[1px] z-10'
                style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.85) 50%, transparent 90%)' }}
            />

            <button
              onClick={onToggle}
              className='w-full flex items-center justify-between cursor-pointer'
              style={{ padding: isOpen ? '10px 14px' : '8px 12px' }}
            >
              <div className='flex items-center gap-2'>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className='text-foreground/40 flex-shrink-0'>
                  <path d="M2 10.5l2-2m4.5-5a3.5 3.5 0 00-5 5l5-5zm0 0L11 2m-2.5 6l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {isOpen && (
                  <>
                    <span className='text-[11px] font-medium text-foreground/55'>Agent log</span>
                    {turns.length > 0 && (
                      <span className='text-[10px] tabular-nums text-foreground/25 font-mono'>{turns.length}</span>
                    )}
                  </>
                )}
              </div>
              {isOpen
                ? <ChevronUp className='w-3 h-3 text-foreground/30' />
                : <ChevronDown className='w-3 h-3 text-foreground/30' />
              }
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className='px-2 pb-2 flex flex-col gap-0.5 max-h-44 overflow-y-auto'>
                            {turns.length === 0 ? (
                                <p className='text-[11px] text-foreground/25 text-center py-3'>
                                    No messages yet
                                </p>
                            ) : turns.map((turn) => {
                                const isSelected = selectedTurnId === turn.id
                                return (
                                    <button
                                        key={turn.id}
                                        onClick={() => onSelectTurn(turn.id)}
                                        className='w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors group'
                                        style={{
                                            background: isSelected
                                                ? isLight ? 'rgba(120,96,60,0.09)' : 'rgba(255,255,255,0.07)'
                                                : 'transparent'
                                        }}
                                    >
                                        {turn.isLoading ? (
                                            <div className='w-3.5 h-3.5 flex-shrink-0 rounded-full border border-foreground/25 border-t-foreground/60 animate-spin' />
                                        ) : (
                                            <svg
                                                width="14" height="14" viewBox="0 0 14 14" fill="none"
                                                className={cn(
                                                    'flex-shrink-0 transition-colors',
                                                    isSelected ? 'text-foreground/60' : 'text-foreground/20 group-hover:text-foreground/45'
                                                )}
                                            >
                                                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                                                <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        )}
                                        <span className={cn(
                                            'text-[11px] truncate flex-1 transition-colors leading-normal',
                                            isSelected ? 'text-foreground/75' : 'text-foreground/40 group-hover:text-foreground/60'
                                        )}>
                                            {turn.prompt}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}