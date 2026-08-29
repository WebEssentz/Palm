'use client'

import { useDispatch } from "react-redux"
import { useAppSelector } from "@/redux/store"
import { undo, redo } from "@/redux/slice/shapes"
import { Undo2, Redo2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export default function HistoryBar() {
    const dispatch = useDispatch()
    const past = useAppSelector((state) => (state.shapes as any).past ?? [])
    const future = useAppSelector((state) => (state.shapes as any).future ?? [])

    const canUndo = past.length > 0
    const canRedo = future.length > 0

    return (
        <div className="h-8 px-1 rounded-full flex items-center gap-0.5 border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 text-black/70 dark:text-white/70 shadow-sm">
            {/* Undo (curves left) */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={() => canUndo && dispatch(undo())}
                        disabled={!canUndo}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                            canUndo
                                ? "cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 text-black/75 dark:text-white/75 hover:text-black dark:hover:text-white"
                                : "opacity-25 cursor-not-allowed text-black/40 dark:text-white/40"
                        }`}
                    >
                        <Undo2 className="w-3.5 h-3.5" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                    Undo — Ctrl / ⌘ Z
                </TooltipContent>
            </Tooltip>

            {/* Redo (curves right) */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={() => canRedo && dispatch(redo())}
                        disabled={!canRedo}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                            canRedo
                                ? "cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 text-black/75 dark:text-white/75 hover:text-black dark:hover:text-white"
                                : "opacity-25 cursor-not-allowed text-black/40 dark:text-white/40"
                        }`}
                    >
                        <Redo2 className="w-3.5 h-3.5" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                    Redo — Ctrl / ⌘ ⇧ Z
                </TooltipContent>
            </Tooltip>
        </div>
    )
}