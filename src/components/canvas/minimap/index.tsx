'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { useAppSelector } from '@/redux/store'
import { setTranslate } from '@/redux/slice/viewport'
import type { Shape } from '@/redux/slice/shapes'
import { motion } from 'framer-motion'
import { Maximize2, Minimize2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

function getShapeBounds(shape: Shape): { x: number; y: number; w: number; h: number } {
    if (shape.type === 'freedraw') {
        if (!shape.points || shape.points.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const p of shape.points) {
            if (p.x < minX) minX = p.x
            if (p.y < minY) minY = p.y
            if (p.x > maxX) maxX = p.x
            if (p.y > maxY) maxY = p.y
        }
        return { x: minX, y: minY, w: Math.max(maxX - minX, 4), h: Math.max(maxY - minY, 4) }
    }
    if (shape.type === 'line' || shape.type === 'arrow') {
        const minX = Math.min(shape.startX, shape.endX)
        const minY = Math.min(shape.startY, shape.endY)
        const w = Math.max(Math.abs(shape.endX - shape.startX), 4)
        const h = Math.max(Math.abs(shape.endY - shape.startY), 4)
        return { x: minX, y: minY, w, h }
    }
    if (shape.type === 'text') {
        const textLen = shape.text?.length || 1
        const fontSize = shape.fontSize || 16
        return {
            x: shape.x ?? 0,
            y: shape.y ?? 0,
            w: Math.max(textLen * fontSize * 0.6, 20),
            h: Math.max(fontSize * 1.2, 16),
        }
    }
    const s = shape as { x?: number; y?: number; w?: number; h?: number }
    return {
        x: s.x ?? 0,
        y: s.y ?? 0,
        w: Math.max(s.w ?? 4, 4),
        h: Math.max(s.h ?? 4, 4),
    }
}

export default function Minimap() {
    const dispatch = useDispatch()
    const containerRef = useRef<HTMLDivElement>(null)
    const [isExpanded, setIsExpanded] = useState(false)
    const [windowSize, setWindowSize] = useState({ w: 1200, h: 800 })
    const isDraggingRef = useRef(false)

    // Select viewport and shapes
    const viewport = useAppSelector((state) => state.viewport)
    const shapesState = useAppSelector((state) => state.shapes.shapes)

    const shapes = useMemo(() => {
        return (shapesState.ids as string[])
            .map((id: string) => shapesState.entities[id])
            .filter(Boolean) as Shape[]
    }, [shapesState])

    // Update window dimensions
    useEffect(() => {
        const updateSize = () => {
            setWindowSize({ w: window.innerWidth, h: window.innerHeight })
        }
        updateSize()
        window.addEventListener('resize', updateSize)
        return () => window.removeEventListener('resize', updateSize)
    }, [])

    // Map container dimensions
    const mapWidth = isExpanded ? 240 : 160
    const mapHeight = isExpanded ? 150 : 100
    const padding = 8

    // Calculate canvas and viewport bounds in world coordinates
    const bounds = useMemo(() => {
        const vpWorldX = -viewport.translate.x / viewport.scale
        const vpWorldY = -viewport.translate.y / viewport.scale
        const vpWorldW = windowSize.w / viewport.scale
        const vpWorldH = windowSize.h / viewport.scale

        let minX = 0
        let minY = 0
        let maxX = 1920
        let maxY = 1080

        if (shapes.length > 0) {
            minX = Infinity
            minY = Infinity
            maxX = -Infinity
            maxY = -Infinity

            for (const shape of shapes) {
                const b = getShapeBounds(shape)
                if (b.x < minX) minX = b.x
                if (b.y < minY) minY = b.y
                if (b.x + b.w > maxX) maxX = b.x + b.w
                if (b.y + b.h > maxY) maxY = b.y + b.h
            }
        }

        const totalMinX = Math.min(minX, vpWorldX)
        const totalMinY = Math.min(minY, vpWorldY)
        const totalMaxX = Math.max(maxX, vpWorldX + vpWorldW)
        const totalMaxY = Math.max(maxY, vpWorldY + vpWorldH)

        const spanX = totalMaxX - totalMinX
        const spanY = totalMaxY - totalMinY
        const padX = Math.max(spanX * 0.2, 300)
        const padY = Math.max(spanY * 0.2, 200)

        return {
            minX: totalMinX - padX,
            minY: totalMinY - padY,
            width: Math.max(totalMaxX - totalMinX + padX * 2, 1200),
            height: Math.max(totalMaxY - totalMinY + padY * 2, 800),
            vpWorldX,
            vpWorldY,
            vpWorldW,
            vpWorldH,
        }
    }, [shapes, viewport.translate.x, viewport.translate.y, viewport.scale, windowSize.w, windowSize.h])

    // Coordinate transformation math
    const usableW = mapWidth - padding * 2
    const usableH = mapHeight - padding * 2
    const minimapScale = Math.min(usableW / bounds.width, usableH / bounds.height)
    const offsetX = padding + (usableW - bounds.width * minimapScale) / 2
    const offsetY = padding + (usableH - bounds.height * minimapScale) / 2

    // Viewport bounding box on minimap
    const vpLeft = (bounds.vpWorldX - bounds.minX) * minimapScale + offsetX
    const vpTop = (bounds.vpWorldY - bounds.minY) * minimapScale + offsetY
    const vpWidth = bounds.vpWorldW * minimapScale
    const vpHeight = bounds.vpWorldH * minimapScale

    // Center viewport at minimap click coordinate
    const jumpToMapPos = useCallback(
        (clientX: number, clientY: number) => {
            if (!containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            const mapX = clientX - rect.left
            const mapY = clientY - rect.top

            const targetWorldX = (mapX - offsetX) / minimapScale + bounds.minX
            const targetWorldY = (mapY - offsetY) / minimapScale + bounds.minY

            const newTx = windowSize.w / 2 - targetWorldX * viewport.scale
            const newTy = windowSize.h / 2 - targetWorldY * viewport.scale

            dispatch(setTranslate({ x: newTx, y: newTy }))
        },
        [offsetX, offsetY, minimapScale, bounds.minX, bounds.minY, windowSize.w, windowSize.h, viewport.scale, dispatch]
    )

    const handlePointerDown = (e: React.PointerEvent) => {
        // Ignore clicks originating on buttons or controls inside minimap
        if ((e.target as HTMLElement).closest('button')) return

        e.stopPropagation()
        e.preventDefault()
        isDraggingRef.current = true
        jumpToMapPos(e.clientX, e.clientY)

        const onPointerMove = (moveEvent: PointerEvent) => {
            if (!isDraggingRef.current) return
            jumpToMapPos(moveEvent.clientX, moveEvent.clientY)
        }

        const onPointerUp = () => {
            isDraggingRef.current = false
            window.removeEventListener('pointermove', onPointerMove)
            window.removeEventListener('pointerup', onPointerUp)
        }

        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)
    }

    return (
        <motion.div
            ref={containerRef}
            animate={{ width: mapWidth, height: mapHeight }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{ transformOrigin: 'bottom right' }}
            onPointerDown={handlePointerDown}
            className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-sm relative overflow-hidden cursor-crosshair select-none origin-bottom-right"
        >
            {/* Subtle Canvas Dot Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#00000010_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none" />

            {/* Render Mini Shapes */}
            <div className="absolute inset-0 pointer-events-none">
                {shapes.map((shape) => {
                    const b = getShapeBounds(shape)
                    const sLeft = (b.x - bounds.minX) * minimapScale + offsetX
                    const sTop = (b.y - bounds.minY) * minimapScale + offsetY
                    const sWidth = Math.max(b.w * minimapScale, 2)
                    const sHeight = Math.max(b.h * minimapScale, 2)

                    if (shape.type === 'frame' || shape.type === 'generatedui') {
                        return (
                            <div
                                key={shape.id}
                                style={{
                                    left: sLeft,
                                    top: sTop,
                                    width: sWidth,
                                    height: sHeight,
                                }}
                                className="absolute border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 rounded-[2px]"
                            />
                        )
                    }

                    return (
                        <div
                            key={shape.id}
                            style={{
                                left: sLeft,
                                top: sTop,
                                width: sWidth,
                                height: sHeight,
                            }}
                            className="absolute bg-neutral-400/50 dark:bg-neutral-500/50 rounded-[1px]"
                        />
                    )
                })}
            </div>

            {/* Current Viewport Rectangle — Black / Theme Aware (NOT PURPLE) */}
            <div
                style={{
                    left: vpLeft,
                    top: vpTop,
                    width: Math.max(vpWidth, 6),
                    height: Math.max(vpHeight, 6),
                }}
                className="absolute border-[1.5px] border-black dark:border-white bg-black/[0.04] dark:bg-white/[0.06] rounded-[3px] pointer-events-none transition-all duration-75 shadow-2xs"
            />

            {/* Expand / Minimize Toggle Button */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onPointerDown={(e) => {
                            e.stopPropagation()
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsExpanded((v) => !v)
                        }}
                        className="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer z-20"
                    >
                        {isExpanded ? (
                            <Minimize2 className="w-3 h-3" />
                        ) : (
                            <Maximize2 className="w-3 h-3" />
                        )}
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6}>
                    {isExpanded ? 'Collapse minimap' : 'Expand minimap'}
                </TooltipContent>
            </Tooltip>
        </motion.div>
    )
}
