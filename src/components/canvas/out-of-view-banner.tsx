'use client'

import { Info } from 'lucide-react'

interface OutOfViewBannerProps {
    onResetView: () => void
    onZoomToFit: () => void
}

export function OutOfViewBanner({ onResetView, onZoomToFit }: OutOfViewBannerProps) {
    return (
        <div className="h-9 px-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#1a1a1c]/95 backdrop-blur-xl shadow-lg flex items-center gap-3 select-none">
            {/* Info icon + Status text */}
            <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-400 shrink-0" strokeWidth={2} />
                <span className="text-xs font-medium text-foreground/90 dark:text-neutral-200 whitespace-nowrap">
                    Your content is out of view
                </span>
            </div>

            {/* Vertical divider */}
            <div className="w-px h-3.5 bg-black/10 dark:bg-white/15 shrink-0" />

            {/* Reset view text button */}
            <button
                type="button"
                onClick={onResetView}
                className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
                Reset view
            </button>

            {/* Zoom to fit action button */}
            <button
                type="button"
                onClick={onZoomToFit}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-neutral-900 dark:text-white bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 border border-black/10 dark:border-white/10 transition-all cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
            >
                Zoom to fit
            </button>
        </div>
    )
}

export default OutOfViewBanner
