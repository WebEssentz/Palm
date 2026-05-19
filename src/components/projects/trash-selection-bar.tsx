'use client'

import { motion } from 'framer-motion'
import { X, Trash2 } from 'lucide-react'
import { GlassTooltip } from '@/components/ui/glass-tooltip'

interface TrashSelectionBarProps {
    selectedCount: number
    totalCount: number
    isLight: boolean
    onCancel: () => void
    onSelectAll: () => void
    onDeleteSelected: () => void
}

export function TrashSelectionBar({
    selectedCount,
    totalCount,
    isLight,
    onCancel,
    onSelectAll,
    onDeleteSelected,
}: TrashSelectionBarProps) {
    const allSelected = selectedCount === totalCount && totalCount > 0

    const glassStyle: React.CSSProperties = isLight ? {
        background: 'rgba(248,244,237,0.92)',
        backdropFilter: 'blur(24px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
        border: '1px solid rgba(255,255,255,0.80)',
        boxShadow: [
            '0 0 0 0.5px rgba(100,76,40,0.10)',
            '0 4px 6px rgba(80,60,30,0.06)',
            '0 12px 28px rgba(80,60,30,0.16)',
            '0 32px 64px rgba(80,60,30,0.10)',
            'inset 0 1px 0 rgba(255,255,255,0.95)',
            'inset 0 -1px 0 rgba(100,76,40,0.05)',
        ].join(', '),
    } : {
        background: 'rgba(28,28,30,0.88)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: [
            '0 0 0 0.5px rgba(255,255,255,0.06)',
            '0 4px 6px rgba(0,0,0,0.22)',
            '0 12px 28px rgba(0,0,0,0.38)',
            '0 32px 64px rgba(0,0,0,0.26)',
            'inset 0 1px 0 rgba(255,255,255,0.10)',
            'inset 0 -1px 0 rgba(0,0,0,0.22)',
        ].join(', '),
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className='fixed bottom-6 left-1/2 -translate-x-1/2 z-[150]'
        >
            <div className='relative overflow-visible rounded-full' style={glassStyle}>
                {/* Specular highlight */}
                <div
                    className='pointer-events-none absolute inset-x-0 top-0 h-[1px]'
                    style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.9) 50%, transparent 95%)' }}
                />

                <div className='flex items-center gap-0.5 px-1.5 py-1.5'>
                    {/* Cancel */}
                    <GlassTooltip content="Deselect all" side="top">
                        <button
                            onClick={onCancel}
                            className='w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all cursor-pointer'
                        >
                            <X className='w-3.5 h-3.5' />
                        </button>
                    </GlassTooltip>

                    <div className='w-px h-4 bg-foreground/10 mx-1' />

                    {/* Count */}
                    <span className='text-xs font-medium text-foreground px-2 tabular-nums whitespace-nowrap'>
                        {selectedCount === 0 ? 'None selected' : `${selectedCount} selected`}
                    </span>

                    <div className='w-px h-4 bg-foreground/10 mx-1' />

                    {/* Select All / Deselect All */}
                    <button
                        onClick={onSelectAll}
                        className='px-3 py-1.5 rounded-full text-xs font-medium text-foreground/60 hover:text-foreground hover:bg-foreground/10 transition-all cursor-pointer whitespace-nowrap'
                    >
                        {allSelected ? 'Deselect All' : 'Select All'}
                    </button>

                    {/* Delete — only when something is selected */}
                    {selectedCount > 0 && (
                        <>
                            <div className='w-px h-4 bg-foreground/10 mx-1' />
                            <button
                                onClick={onDeleteSelected}
                                className='flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-all cursor-pointer whitespace-nowrap'
                            >
                                <Trash2 className='w-3 h-3' />
                                Delete ({selectedCount})
                            </button>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    )
}