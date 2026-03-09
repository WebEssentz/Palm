'use client'

import { Button } from "@/components/ui/button"
import { useInfiniteCanvas } from "@/hooks/use-canvas"
import { setScale } from "@/redux/slice/viewport"
import { ZoomIn, ZoomOut } from "lucide-react"
import { useDispatch } from "react-redux"

const ZoomBar = () => {
    const dispatch = useDispatch()
    const { viewport } = useInfiniteCanvas()

    const handleZoomOut = () => {
        const newScale = Math.max(viewport.scale / 1.2, viewport.minScale)
        dispatch(setScale({ scale: newScale }))
    }

    const handleZoomIn = () => {
        const newScale = Math.min(viewport.scale * 1.2, viewport.maxScale)
        dispatch(setScale({ scale: newScale }))
    }

    return (
        <div className="col-span-1 flex justify-end items-center">
            <div className="flex items-center gap-1 backdrop-blur-xl bg-muted border border-border dark:bg-white/[0.08] dark:border-white/[0.12] rounded-full p-3 saturate-150">
                <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleZoomOut}
                    title="Zoom Out"
                    className="w-9 h-9 rounded-full p-0 rounded-full cursor-pointer hover:bg-accent dark:hover:bg-white/[0.12] border border-transparent hover:border-border dark:hover:border-white/[0.16] transition-all"
                >
                    <ZoomOut className="w-4 h-4 text-foreground" />
                </Button>

                <div className="text-center">
                    <span className="text-sm font-mono leading-none text-foreground">
                        {Math.round(viewport.scale * 100)}%
                    </span>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomIn}
                    title="Zoom In"
                    className="w-9 h-9 rounded-full p-0 rounded-full cursor-pointer hover:bg-accent dark:hover:bg-white/[0.12] border border-transparent hover:border-border dark:hover:border-white/[0.16] transition-all"
                >
                    <ZoomIn className="w-4 h-4 text-foreground" />
                </Button>

            </div>
        </div>
    )
}

export default ZoomBar
