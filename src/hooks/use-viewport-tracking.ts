'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/redux/store'
import { Point } from '@/redux/slice/viewport'
import type { Shape } from '@/redux/slice/shapes'
import { getShapeBounds, getAllShapesBounds, shapeIntersectsViewport, ViewportRect } from '@/lib/canvas-bounds'
import { animateViewport, easeInOutCubic, stopViewportAnimation } from '@/lib/viewport-animator'

export function useViewportTracking() {
    const dispatch = useAppDispatch()
    const viewport = useAppSelector((state) => state.viewport)
    const shapesState = useAppSelector((state) => state.shapes.shapes)
    const selectedMap = useAppSelector((state) => state.shapes.selected)

    const [windowSize, setWindowSize] = useState({ w: 1200, h: 800 })
    const [isOutOfView, setIsOutOfView] = useState(false)
    const animRef = useRef<number | null>(null)
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

    // Shapes array
    const shapes = useMemo(() => {
        return (shapesState.ids as string[])
            .map((id: string) => shapesState.entities[id])
            .filter(Boolean) as Shape[]
    }, [shapesState])

    // Selected shapes array
    const selectedShapes = useMemo(() => {
        const ids = Object.keys(selectedMap || {})
        if (ids.length === 0) return []
        return ids
            .map((id) => shapesState.entities[id])
            .filter(Boolean) as Shape[]
    }, [selectedMap, shapesState])

    // Window size tracking
    useEffect(() => {
        const update = () => {
            setWindowSize({ w: window.innerWidth, h: window.innerHeight })
        }
        update()
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
    }, [])

    // Viewport world bounds
    const vpBounds: ViewportRect = useMemo(() => {
        const x1 = -viewport.translate.x / viewport.scale
        const y1 = -viewport.translate.y / viewport.scale
        const w = windowSize.w / viewport.scale
        const h = windowSize.h / viewport.scale
        return {
            x1,
            y1,
            x2: x1 + w,
            y2: y1 + h,
            w,
            h,
        }
    }, [viewport.translate.x, viewport.translate.y, viewport.scale, windowSize.w, windowSize.h])

    // Content overall bounding box
    const contentBounds = useMemo(() => {
        return getAllShapesBounds(shapes)
    }, [shapes])

    // Real-time check if content is in view
    const isActuallyInView = useMemo(() => {
        if (shapes.length === 0) return true // No content drawn -> not out of view
        return shapes.some((shape) => {
            const b = getShapeBounds(shape)
            return shapeIntersectsViewport(b, vpBounds)
        })
    }, [shapes, vpBounds])

    // Debounced tracking so the menu animates in sleekly without flickering during active panning
    useEffect(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
            debounceTimerRef.current = null
        }

        if (shapes.length === 0) {
            setIsOutOfView(false)
            return
        }

        if (!isActuallyInView) {
            // Out of view: animate in after 150ms of staying out of view
            debounceTimerRef.current = setTimeout(() => {
                setIsOutOfView(true)
            }, 150)
        } else {
            // In view: animate out immediately (0ms delay)
            setIsOutOfView(false)
        }

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
            }
        }
    }, [isActuallyInView, shapes.length])

    // Smooth sleek camera flight
    const animateTo = useCallback((targetScale: number, targetTranslate: Point, duration = 650) => {
        animateViewport({
            dispatch,
            startScale: viewport.scale,
            startTranslate: viewport.translate,
            targetScale,
            targetTranslate,
            duration,
            easing: easeInOutCubic,
        })
    }, [dispatch, viewport.scale, viewport.translate])

    // Reset view: zooms out totally to lowest viewport (minScale) centered on content
    const resetView = useCallback(() => {
        const targetScale = viewport.minScale // lowest viewport (e.g. 0.1)
        let targetX = windowSize.w / 2
        let targetY = windowSize.h / 2

        if (contentBounds) {
            targetX = windowSize.w / 2 - contentBounds.centerX * targetScale
            targetY = windowSize.h / 2 - contentBounds.centerY * targetScale
        }

        animateTo(targetScale, { x: targetX, y: targetY }, 750)
    }, [animateTo, contentBounds, viewport.minScale, windowSize.w, windowSize.h])

    // Zoom to fit: takes us to where the stuff is, fitted comfortably
    const zoomToFit = useCallback(() => {
        if (!contentBounds) return

        const padX = Math.max(80, windowSize.w * 0.12)
        const padY = Math.max(80, windowSize.h * 0.12)

        const availW = Math.max(10, windowSize.w - padX * 2)
        const availH = Math.max(10, windowSize.h - padY * 2)

        const scaleX = availW / contentBounds.width
        const scaleY = availH / contentBounds.height
        const fitScale = Math.min(scaleX, scaleY)

        // Clamp between minScale and 1.0 (100% zoom)
        const targetScale = Math.min(Math.max(fitScale, viewport.minScale), 1.0)

        const targetX = windowSize.w / 2 - contentBounds.centerX * targetScale
        const targetY = windowSize.h / 2 - contentBounds.centerY * targetScale

        animateTo(targetScale, { x: targetX, y: targetY }, 750)
    }, [animateTo, contentBounds, viewport.minScale, windowSize.w, windowSize.h])

    // Zoom to selection: fits selected shapes, or all content if none selected
    const zoomToSelection = useCallback(() => {
        const targetShapes = selectedShapes.length > 0 ? selectedShapes : shapes
        const bounds = getAllShapesBounds(targetShapes)
        if (!bounds) return

        const padX = Math.max(80, windowSize.w * 0.12)
        const padY = Math.max(80, windowSize.h * 0.12)

        const availW = Math.max(10, windowSize.w - padX * 2)
        const availH = Math.max(10, windowSize.h - padY * 2)

        const scaleX = availW / bounds.width
        const scaleY = availH / bounds.height
        const fitScale = Math.min(scaleX, scaleY)

        const targetScale = Math.min(Math.max(fitScale, viewport.minScale), viewport.maxScale)

        const targetX = windowSize.w / 2 - bounds.centerX * targetScale
        const targetY = windowSize.h / 2 - bounds.centerY * targetScale

        animateTo(targetScale, { x: targetX, y: targetY }, 750)
    }, [animateTo, selectedShapes, shapes, viewport.minScale, viewport.maxScale, windowSize.w, windowSize.h])

    // Listen to custom window events
    useEffect(() => {
        const handleZoomToFit = () => zoomToFit()
        const handleResetView = () => resetView()
        const handleZoomToSelection = () => zoomToSelection()

        window.addEventListener('canvas-zoom-to-fit', handleZoomToFit)
        window.addEventListener('canvas-reset-view', handleResetView)
        window.addEventListener('canvas-zoom-to-selection', handleZoomToSelection)

        return () => {
            window.removeEventListener('canvas-zoom-to-fit', handleZoomToFit)
            window.removeEventListener('canvas-reset-view', handleResetView)
            window.removeEventListener('canvas-zoom-to-selection', handleZoomToSelection)
        }
    }, [zoomToFit, resetView, zoomToSelection])

    // Cleanup animation on unmount
    useEffect(() => {
        return () => {
            stopViewportAnimation()
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        }
    }, [])

    return {
        isOutOfView,
        contentBounds,
        hasShapes: shapes.length > 0,
        resetView,
        zoomToFit,
        zoomToSelection,
    }
}
