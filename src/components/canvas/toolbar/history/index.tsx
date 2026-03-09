"use client"

import { Redo2, Undo2 } from "lucide-react"
import React from "react"

const HistoryPill = () => {
    return (
        <div className="col-span-1 flex justify-start items-center">
            <div
              aria-hidden
              className="inline-flex items-center rounded-full backdrop-blur-xl bg-muted border border-border dark:bg-white/[0.08] dark:border-white/[0.12] p-2 text-foreground saturate-150"
            >
              <span className="inline-grid h-9 w-9 place-items-center rounded-full hover:bg-accent dark:hover:bg-white/[0.12] transition-all cursor-pointer">
                <Undo2 size={18} className="opacity-80 stroke-[1.75]" />
              </span>

              <span className="mx-1 h-5 w-px rounded bg-border"/>
              <span className="inline-grid h-9 w-9 place-items-center rounded-full hover:bg-accent dark:hover:bg-white/[0.12] transition-all cursor-pointer">
                <Redo2 size={18} className="opacity-80 stroke-[1.75]" />
              </span>
            </div>
        </div>
    )
}

export default HistoryPill