"use client"

import { generateFrameSnapshot } from "@/lib/frame-snapshot"
import { measureText } from "@/lib/measure-text"
import { StyleTokens } from "@/lib/generate-ui"
import { useGenerateWorkflowMutation } from "@/redux/api/generation"
import {
    addArrow,
    addEllipse,
    addFrame,
    addFreeDrawShape,
    addLine,
    addRect,
    addText,
    clearSelection,
    removeShape,
    selectShape,
    setTool,
    Shape,
    Tool,
    updateShape,
    groupSelected,
    ungroupSelected,
    duplicateSelected,
    deleteSelected,
    FrameShape,
    addGeneratedUI
} from "@/redux/slice/shapes"
import { handToolDisable, handToolEnable, panEnd, panMove, panStart, Point, screenToWorld, wheelPan, wheelZoom } from "@/redux/slice/viewport"
import { AppDispatch, useAppDispatch, useAppSelector } from "@/redux/store"
import { nanoid } from "@reduxjs/toolkit"
import React from "react"
import { useDispatch } from "react-redux"
import { toast } from "sonner"


const RAF_INTERNAL_MS = 8

// Module-level handlers to prevent StrictMode listener stacking
let _keydownHandler: ((e: KeyboardEvent) => void) | null = null
let _keyupHandler: ((e: KeyboardEvent) => void) | null = null

interface TouchPointer {
    id: number
    p: Point
}

interface DraftShape {
    type: 'frame' | 'rect' | 'ellipse' | 'line' | 'arrow'
    startWorld: Point
    currentWorld: Point
}

export const useInfiniteCanvas = () => {
    const dispatch = useDispatch<AppDispatch>()

    const viewport = useAppSelector((s) => s.viewport)
    const entityState = useAppSelector((s) => s.shapes.shapes)

    const shapeList: Shape[] = entityState.ids
        .map((id: string) => entityState.entities[id])
        .filter((s: Shape | undefined): s is Shape => Boolean(s))
        .sort((a: Shape, b: Shape) => {
            // Frames always at the bottom
            if (a.type === 'frame' && b.type !== 'frame') return -1
            if (a.type !== 'frame' && b.type === 'frame') return 1
            // Groups just above frames
            if (a.type === 'group' && b.type !== 'group' && b.type !== 'frame') return -1
            if (a.type !== 'group' && a.type !== 'frame' && b.type === 'group') return 1
            // Everything else keeps original order
            return 0
        })

    const currentTool = useAppSelector((s) => s.shapes.tool)
    const selectedShapes = useAppSelector((s) => s.shapes.selected)

    const selectedShapesRef = React.useRef(selectedShapes)
    React.useEffect(() => {
        selectedShapesRef.current = selectedShapes
    }, [selectedShapes])

    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
    const [isEditingText, setIsEditingText] = React.useState(false)
    const [hoveredShapeId, setHoveredShapeId] = React.useState<string | null>(null)

    const hasSelectedText = isEditingText

    React.useEffect(() => {
        if (hasSelectedText && !isSidebarOpen) {
            setIsSidebarOpen(true)
        } else if (!hasSelectedText) {
            setIsSidebarOpen(false)
        }
    }, [hasSelectedText, isSidebarOpen])

    React.useEffect(() => {
        const handler = (e: Event) => {
            const custom = e as CustomEvent
            setIsEditingText(custom.detail.editing)
            isEditingTextRef.current = custom.detail.editing
        }
        window.addEventListener('text-editing-change', handler)
        return () => window.removeEventListener('text-editing-change', handler)
    }, [])

    const canvasRef = React.useRef<HTMLDivElement | null>(null)
    const touchMapRef = React.useRef<Map<number, TouchPointer>>(new Map())

    const draftShapeRef = React.useRef<DraftShape | null>(null)
    const freeDrawPointsRef = React.useRef<Point[]>([])
    const clipboardRef = React.useRef<Shape[]>([])
    const pointToPointRef = React.useRef<{
        type: 'line' | 'arrow'
        startWorld: Point
        currentWorld: Point
    } | null>(null)

    const isSpacedPressed = React.useRef(false)
    const isDrawingRef = React.useRef(false)
    const isMovingRef = React.useRef(false)
    const moveStartRef = React.useRef<Point | null>(null)

    const initialShapePositionsRef = React.useRef<
        Record<
            string,
            {
                x?: number
                y?: number
                points?: Point[]
                startX?: number
                startY?: number
                endX?: number
                endY?: number
            }
        >
    >({})

    const isErasingRef = React.useRef(false)
    const erasedShapeRef = React.useRef<Set<string>>(new Set())
    const isResizingRef = React.useRef(false)
    const isShiftPressedRef = React.useRef(false)
    const resizeDataRef = React.useRef<{
        shapeId: string
        corner: string
        initialBounds: { x: number; y: number; w: number; h: number }
        startPoint: { x: number; y: number }
        aspectRatio: number
    } | null>(null)

    const lastFreehandFrameRef = React.useRef(0)
    const freehandRafRef = React.useRef<number | null>(null)
    const panRafRef = React.useRef<number | null>(null)
    const pendingPanPointRef = React.useRef<Point | null>(null)

    const isEditingTextRef = React.useRef(false)

    const marqueeStartRef = React.useRef<Point | null>(null)
    const marqueeCurrentRef = React.useRef<Point | null>(null)
    const isMarqueeingRef = React.useRef(false)

    const lastClickTimeRef = React.useRef(0)
    const lastClickShapeIdRef = React.useRef<string | null>(null)

    const [, force] = React.useState(0)
    const requestRender = (): void => {
        force((n) => (n + 1) | 0)
    }

    const localPointFromClient = (clientX: number, clientY: number): Point => {
        const el = canvasRef.current
        if (!el) return { x: clientX, y: clientY }
        const r = el.getBoundingClientRect()
        return { x: clientX - r.left, y: clientY - r.top }
    }

    const blurActiveTextInput = () => {
        const activeElement = document.activeElement
        if (activeElement && activeElement.tagName === 'INPUT') {
            (activeElement as HTMLInputElement).blur()
        }
    }

    type WithClientXY = { clientX: number; clientY: number }

    const getLocalPointFromPtr = (e: WithClientXY): Point =>
        localPointFromClient(e.clientX, e.clientY)

    const getShapeAtPoint = (worldPoint: Point): Shape | null => {
        for (let i = shapeList.length - 1; i >= 0; i--) {
            const shape = shapeList[i]
            if (isPointInShape(worldPoint, shape)) {
                return shape
            }
        }
        return null
    }

    const snapToNearestEndpoint = (point: Point): Point => {
        const SNAP_THRESHOLD = 15
        for (const shape of shapeList) {
            if (shape.type === 'line' || shape.type === 'arrow') {
                const endpoints = [
                    { x: shape.startX, y: shape.startY },
                    { x: shape.endX, y: shape.endY }
                ]
                for (const ep of endpoints) {
                    const dx = point.x - ep.x
                    const dy = point.y - ep.y
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    if (dist <= SNAP_THRESHOLD) {
                        return ep
                    }
                }
            }
        }
        return point
    }

    const isPointInShape = (point: Point, shape: Shape): boolean => {
        switch (shape.type) {
            case 'frame':
            case 'rect':
            case 'ellipse':
            case 'generatedui':
                return (
                    point.x >= shape.x &&
                    point.x <= shape.x + shape.w &&
                    point.y >= shape.y &&
                    point.y <= shape.y + shape.h
                )
            case 'freedraw':
                const threshold = 5
                for (let i = 0; i < shape.points.length - 1; i++) {
                    const p1 = shape.points[i]
                    const p2 = shape.points[i + 1]
                    if (distanceToLineSegment(point, p1, p2) <= threshold) {
                        return true
                    }
                }

                return false

            case 'arrow':
            case 'line':
                const lineThreshold = 8
                return (
                    distanceToLineSegment(
                        point,
                        { x: shape.startX, y: shape.startY },
                        { x: shape.endX, y: shape.endY }
                    ) <= lineThreshold
                )


            case 'text':
                const { width, height } = measureText(shape)
                return (
                    point.x >= shape.x - 2 &&
                    point.x <= shape.x + width + 12 &&
                    point.y >= shape.y - 2 &&
                    point.y <= shape.y + height + 8
                )
            case 'group':
                return (
                    point.x >= shape.x && point.x <= shape.x + shape.w &&
                    point.y >= shape.y && point.y <= shape.y + shape.h
                )
            default:
                return false
        }
    }

    const isShapeInMarquee = (
        shape: Shape,
        x1: number, y1: number,
        x2: number, y2: number
    ): boolean => {
        switch (shape.type) {
            case 'frame':
            case 'rect':
            case 'ellipse':
            case 'generatedui':
                // Shape's center must be inside marquee
                const cx = shape.x + shape.w / 2
                const cy = shape.y + shape.h / 2
                return cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2
            case 'text':
                return shape.x >= x1 && shape.x <= x2 && shape.y >= y1 && shape.y <= y2
            case 'arrow':
            case 'line':
                return (
                    shape.startX >= x1 && shape.startX <= x2 &&
                    shape.startY >= y1 && shape.startY <= y2 &&
                    shape.endX >= x1 && shape.endX <= x2 &&
                    shape.endY >= y1 && shape.endY <= y2
                )
            case 'freedraw':
                return shape.points.every(p => p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2)
            case 'group':
                const gcx = shape.x + shape.w / 2
                const gcy = shape.y + shape.h / 2
                return gcx >= x1 && gcx <= x2 && gcy >= y1 && gcy <= y2
            default:
                return false
        }
    }

    const distanceToLineSegment = (
        point: Point,
        lineStart: Point,
        lineEnd: Point
    ): number => {
        const A = point.x - lineStart.x
        const B = point.y - lineStart.y
        const C = lineEnd.x - lineStart.x
        const D = lineEnd.y - lineStart.y

        const dot = A * C + B * D
        const lenSq = C * C + D * D

        let param = -1
        if (lenSq !== 0) param = dot / lenSq

        let xx, yy

        if (param < 0) {
            xx = lineStart.x
            yy = lineStart.y
        } else if (param > 1) {
            xx = lineEnd.x
            yy = lineEnd.y
        } else {
            xx = lineStart.x + param * C
            yy = lineStart.y + param * D
        }

        const dx = point.x - xx
        const dy = point.y - yy
        return Math.sqrt(dx * dx + dy * dy)
    }

    const schedulePanMove = (p: Point) => {
        pendingPanPointRef.current = p
        if (panRafRef.current != null) return
        panRafRef.current = window.requestAnimationFrame(() => {
            panRafRef.current = null
            const next = pendingPanPointRef.current
            if (next) dispatch(panMove(next))
        })
    }

    const freehandTick = (): void => {
        const now = performance.now()

        if (now - lastFreehandFrameRef.current >= RAF_INTERNAL_MS) {
            if (freeDrawPointsRef.current.length > 0) requestRender()
            lastFreehandFrameRef.current = now
        }

        if (isDrawingRef.current) {
            freehandRafRef.current = window.requestAnimationFrame(freehandTick)
        }
    }

    const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        const originScreen = localPointFromClient(e.clientX, e.clientY)
        if (e.ctrlKey || e.metaKey) {
            dispatch(wheelZoom({ deltaY: e.deltaY, originScreen }))
        } else {
            const dx = e.shiftKey ? e.deltaY : e.deltaX
            const dy = e.shiftKey ? 0 : e.deltaY
            dispatch(wheelPan({ dx: -dx, dy: -dy }))
        }
    }

    const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
        const target = e.target as HTMLElement
        const isInteractive =
            target.tagName === 'BUTTON' ||
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            (target as HTMLElement).isContentEditable ||
            !!target.closest('button') ||
            !!target.closest('input') ||
            !!target.closest('textarea') ||
            !!target.closest('[contenteditable="true"]')

        if (isInteractive) return

        e.preventDefault()
        canvasRef.current?.focus() // re-claims focus after e.preventDefault() swallowed it

        const local = getLocalPointFromPtr(e.nativeEvent)
        const world = screenToWorld(local, viewport.translate, viewport.scale)

        if (e.button === 0) {
            const now = Date.now()
            const hitShape = getShapeAtPoint(world)

            // Timestamp-based double-click detection — reliable regardless of pointer capture
            const isDoubleClick =
                now - lastClickTimeRef.current < 300 &&
                hitShape?.id === lastClickShapeIdRef.current

            lastClickTimeRef.current = now
            lastClickShapeIdRef.current = hitShape?.id ?? null

            if (isDoubleClick && hitShape?.type === 'text') {
                window.dispatchEvent(new CustomEvent('text-enter-edit', {
                    detail: { id: hitShape.id }
                }))
                return
            }
        }

        if (touchMapRef.current.size <= 1) {
            canvasRef.current?.setPointerCapture?.(e.pointerId)
            const isPanButton = e.button === 1 || e.button === 2
            const panByShift = isSpacedPressed.current && e.button === 0
            const isPanTool = currentTool === 'pan' && e.button === 0

            if (isPanButton || panByShift || isPanTool) {
                const mode = isSpacedPressed.current ? 'shiftPanning' : 'panning'
                dispatch(panStart({ screen: local, mode }))
            }

            if (e.button === 0) {
                if (currentTool === 'select') {
                    const hitShape = getShapeAtPoint(world)
                    if (hitShape) {
                        const isAlreadySelected = selectedShapes[hitShape.id]
                        if (!isAlreadySelected) {
                            if (!e.shiftKey) dispatch(clearSelection())
                            dispatch(selectShape(hitShape.id))
                        }
                        // Force canvas focus so keyboard events work for generatedui
                        if (hitShape.type === 'generatedui') {
                            canvasRef.current?.focus();
                        }
                        isMovingRef.current = true
                        moveStartRef.current = world

                        initialShapePositionsRef.current = {}
                        Object.keys(selectedShapes).forEach((id) => {
                            const shape = entityState.entities[id]
                            if (shape) {
                                if (
                                    shape.type === 'frame' ||
                                    shape.type === 'rect' ||
                                    shape.type === 'ellipse' ||
                                    shape.type === 'generatedui'
                                ) {
                                    initialShapePositionsRef.current[id] = {
                                        x: shape.x,
                                        y: shape.y
                                    }
                                } else if (shape.type === 'freedraw') {
                                    initialShapePositionsRef.current[id] = {
                                        points: [...shape.points],
                                    }
                                } else if (shape.type === 'arrow' || shape.type === 'line') {
                                    initialShapePositionsRef.current[id] = {
                                        startX: shape.startX,
                                        startY: shape.startY,
                                        endX: shape.endX,
                                        endY: shape.endY
                                    }
                                } else if (shape.type === 'text') {
                                    initialShapePositionsRef.current[id] = {
                                        x: shape.x,
                                        y: shape.y
                                    }
                                } else if (shape.type === 'group') {
                                    initialShapePositionsRef.current[id] = {
                                        x: shape.x,
                                        y: shape.y
                                    }
                                    // Store initial positions of children
                                    shape.childIds.forEach((childId: any) => {
                                        const child = entityState.entities[childId]
                                        if (child) {
                                            if (
                                                child.type === 'frame' ||
                                                child.type === 'rect' ||
                                                child.type === 'ellipse' ||
                                                child.type === 'generatedui'
                                            ) {
                                                initialShapePositionsRef.current[childId] = {
                                                    x: child.x,
                                                    y: child.y
                                                }
                                            } else if (child.type === 'freedraw') {
                                                initialShapePositionsRef.current[childId] = {
                                                    points: [...child.points],
                                                }
                                            } else if (child.type === 'arrow' || child.type === 'line') {
                                                initialShapePositionsRef.current[childId] = {
                                                    startX: child.startX,
                                                    startY: child.startY,
                                                    endX: child.endX,
                                                    endY: child.endY
                                                }
                                            } else if (child.type === 'text') {
                                                initialShapePositionsRef.current[childId] = {
                                                    x: child.x,
                                                    y: child.y
                                                }
                                            }
                                        }
                                    })
                                }
                            }
                        })

                        if (hitShape.type === 'frame') {
                            initialShapePositionsRef.current[hitShape.id] = {
                                x: hitShape.x,
                                y: hitShape.y
                            }
                            // Capture all shapes inside this frame
                            shapeList.forEach(s => {
                                if (s.type === 'frame') return
                                const insideFrame =
                                    s.x >= hitShape.x &&
                                    s.x + (s.w || 0) <= hitShape.x + hitShape.w &&
                                    s.y >= hitShape.y &&
                                    s.y + (s.h || 0) <= hitShape.y + hitShape.h

                                if (insideFrame) {
                                    if (s.type === 'rect' || s.type === 'ellipse' ||
                                        s.type === 'text' || s.type === 'generatedui') {
                                        initialShapePositionsRef.current[s.id] = { x: s.x, y: s.y }
                                    } else if (s.type === 'freedraw') {
                                        initialShapePositionsRef.current[s.id] = { points: [...s.points] }
                                    } else if (s.type === 'line' || s.type === 'arrow') {
                                        initialShapePositionsRef.current[s.id] = {
                                            startX: s.startX, startY: s.startY,
                                            endX: s.endX, endY: s.endY
                                        }
                                    }
                                }
                            })
                        } else if (
                            hitShape.type === 'rect' ||
                            hitShape.type === 'ellipse' ||
                            hitShape.type === 'generatedui'
                        ) {
                            initialShapePositionsRef.current[hitShape.id] = {
                                x: hitShape.x,
                                y: hitShape.y
                            }
                        } else if (hitShape.type === 'freedraw') {
                            initialShapePositionsRef.current[hitShape.id] = {
                                points: [...hitShape.points]
                            }
                        } else if (hitShape.type === 'arrow' || hitShape.type === 'line') {
                            initialShapePositionsRef.current[hitShape.id] = {
                                startX: hitShape.startX,
                                startY: hitShape.startY,
                                endX: hitShape.endX,
                                endY: hitShape.endY
                            }
                        } else if (hitShape.type === 'text') {
                            initialShapePositionsRef.current[hitShape.id] = {
                                x: hitShape.x,
                                y: hitShape.y
                            }
                        } else if (hitShape.type === 'group') {
                            initialShapePositionsRef.current[hitShape.id] = {
                                x: hitShape.x,
                                y: hitShape.y
                            }
                            // Store initial positions of children
                            hitShape.childIds.forEach((childId) => {
                                const child = entityState.entities[childId]
                                if (child) {
                                    if (
                                        child.type === 'frame' ||
                                        child.type === 'rect' ||
                                        child.type === 'ellipse' ||
                                        child.type === 'generatedui'
                                    ) {
                                        initialShapePositionsRef.current[childId] = {
                                            x: child.x,
                                            y: child.y
                                        }
                                    } else if (child.type === 'freedraw') {
                                        initialShapePositionsRef.current[childId] = {
                                            points: [...child.points],
                                        }
                                    } else if (child.type === 'arrow' || child.type === 'line') {
                                        initialShapePositionsRef.current[childId] = {
                                            startX: child.startX,
                                            startY: child.startY,
                                            endX: child.endX,
                                            endY: child.endY
                                        }
                                    } else if (child.type === 'text') {
                                        initialShapePositionsRef.current[childId] = {
                                            x: child.x,
                                            y: child.y
                                        }
                                    }
                                }
                            })
                        }
                    } else {
                        // No shape hit — start marquee instead of just clearing
                        if (!e.shiftKey) dispatch(clearSelection())
                        blurActiveTextInput()
                        isMarqueeingRef.current = true
                        marqueeStartRef.current = world
                        marqueeCurrentRef.current = world
                        requestRender()
                    }
                } else if (currentTool === 'eraser') {
                    isErasingRef.current = true
                    erasedShapeRef.current.clear()
                    const hitShape = getShapeAtPoint(world)
                    if (hitShape) {
                        dispatch(removeShape(hitShape.id))
                        erasedShapeRef.current.add(hitShape.id)
                    } else {
                        blurActiveTextInput()
                    }
                } else if (currentTool === 'text') {
                    dispatch(addText({ x: world.x, y: world.y }))
                    dispatch(setTool('select'))
                } else if (currentTool === 'line' || currentTool === 'arrow') {
                    if (!pointToPointRef.current) {
                        // First click — set start point
                        pointToPointRef.current = {
                            type: currentTool,
                            startWorld: world,
                            currentWorld: world
                        }
                        requestRender()
                    } else {
                        // Second click — commit the line
                        const start = pointToPointRef.current.startWorld
                        const end = world
                        const snappedStart = snapToNearestEndpoint(start)
                        const snappedEnd = snapToNearestEndpoint(end)

                        if (currentTool === 'line') {
                            dispatch(addLine({
                                startX: snappedStart.x,
                                startY: snappedStart.y,
                                endX: snappedEnd.x,
                                endY: snappedEnd.y
                            }))
                        } else {
                            dispatch(addArrow({
                                startX: snappedStart.x,
                                startY: snappedStart.y,
                                endX: snappedEnd.x,
                                endY: snappedEnd.y
                            }))
                        }
                        pointToPointRef.current = null
                        requestRender()
                    }
                } else {
                    isDrawingRef.current = true
                    if (
                        currentTool === 'frame' ||
                        currentTool === 'rect' ||
                        currentTool === 'ellipse'
                    ) {
                        console.log('Starting to draw: ', currentTool, 'at: ', world)
                        draftShapeRef.current = {
                            type: currentTool as 'frame' | 'rect' | 'ellipse' | 'line' | 'arrow',
                            startWorld: world,
                            currentWorld: world
                        }
                        requestRender()
                    } else if (currentTool === 'freedraw') {
                        freeDrawPointsRef.current = [world]
                        lastFreehandFrameRef.current = performance.now()
                        freehandRafRef.current = window.requestAnimationFrame(freehandTick)
                        requestRender()
                    }
                }
            }
        }
    }

    const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
        const local = getLocalPointFromPtr(e.nativeEvent)
        const world = screenToWorld(local, viewport.translate, viewport.scale)

        // Track hover for all shape types
        if (!isMovingRef.current && !isDrawingRef.current && !isMarqueeingRef.current && currentTool !== 'pan') {
            const hit = getShapeAtPoint(world)
            setHoveredShapeId(hit?.id ?? null)
        }

        if (viewport.mode === 'panning' || viewport.mode === 'shiftPanning') {
            schedulePanMove(local)
            return
        }

        if (isErasingRef.current && currentTool === 'eraser') {
            const hitShape = getShapeAtPoint(world)
            if (hitShape && !erasedShapeRef.current.has(hitShape.id)) {
                dispatch(removeShape(hitShape.id))
                erasedShapeRef.current.add(hitShape.id)
            }
        }

        if (
            isMovingRef.current &&
            moveStartRef.current &&
            currentTool === 'select'
        ) {
            const deltaX = world.x - moveStartRef.current.x
            const deltaY = world.y - moveStartRef.current.y

            Object.keys(initialShapePositionsRef.current).forEach((id) => {
                const initialPos = initialShapePositionsRef.current[id]
                const shape = entityState.entities[id]

                if (shape && initialPos) {
                    if (
                        shape.type === 'frame' ||
                        shape.type === 'rect' ||
                        shape.type === 'ellipse' ||
                        shape.type === 'text' ||
                        shape.type === 'generatedui'
                    ) {
                        if (
                            typeof initialPos.x === 'number' &&
                            typeof initialPos.y === 'number'
                        ) {
                            dispatch(
                                updateShape({
                                    id,
                                    patch: {
                                        x: initialPos.x + deltaX,
                                        y: initialPos.y + deltaY
                                    }
                                })
                            )
                        }
                    } else if (shape.type === 'freedraw') {
                        const initialPoints = initialPos.points
                        if (initialPoints) {
                            const newPoints = initialPoints.map((point) => ({
                                x: point.x + deltaX,
                                y: point.y + deltaY
                            }))
                            dispatch(
                                updateShape({
                                    id,
                                    patch: {
                                        points: newPoints
                                    }
                                })
                            )
                        }
                    } else if (shape.type === 'arrow' || shape.type === 'line') {
                        if (
                            typeof initialPos.startX === 'number' &&
                            typeof initialPos.startY === 'number' &&
                            typeof initialPos.endX === 'number' &&
                            typeof initialPos.endY === 'number'
                        ) {
                            dispatch(
                                updateShape({
                                    id,
                                    patch: {
                                        startX: initialPos.startX + deltaX,
                                        startY: initialPos.startY + deltaY,
                                        endX: initialPos.endX + deltaX,
                                        endY: initialPos.endY + deltaY,
                                    }
                                })
                            )
                        }
                    } else if (shape.type === 'group') {
                        if (
                            typeof initialPos.x === 'number' &&
                            typeof initialPos.y === 'number'
                        ) {
                            // Move the group bounding box
                            dispatch(
                                updateShape({
                                    id,
                                    patch: {
                                        x: initialPos.x + deltaX,
                                        y: initialPos.y + deltaY
                                    }
                                })
                            )
                            // Move all children
                            shape.childIds.forEach((childId: any) => {
                                const childInitial = initialShapePositionsRef.current[childId]
                                const child = entityState.entities[childId]
                                if (!child || !childInitial) return
                                if (
                                    child.type === 'frame' ||
                                    child.type === 'rect' ||
                                    child.type === 'ellipse' ||
                                    child.type === 'text' ||
                                    child.type === 'generatedui'
                                ) {
                                    if (
                                        typeof childInitial.x === 'number' &&
                                        typeof childInitial.y === 'number'
                                    ) {
                                        dispatch(
                                            updateShape({
                                                id: childId,
                                                patch: {
                                                    x: childInitial.x + deltaX,
                                                    y: childInitial.y + deltaY
                                                }
                                            })
                                        )
                                    }
                                } else if (child.type === 'freedraw') {
                                    const initialPoints = childInitial.points
                                    if (initialPoints) {
                                        const newPoints = initialPoints.map((point) => ({
                                            x: point.x + deltaX,
                                            y: point.y + deltaY
                                        }))
                                        dispatch(
                                            updateShape({
                                                id: childId,
                                                patch: {
                                                    points: newPoints
                                                }
                                            })
                                        )
                                    }
                                } else if (child.type === 'arrow' || child.type === 'line') {
                                    if (
                                        typeof childInitial.startX === 'number' &&
                                        typeof childInitial.startY === 'number' &&
                                        typeof childInitial.endX === 'number' &&
                                        typeof childInitial.endY === 'number'
                                    ) {
                                        dispatch(
                                            updateShape({
                                                id: childId,
                                                patch: {
                                                    startX: childInitial.startX + deltaX,
                                                    startY: childInitial.startY + deltaY,
                                                    endX: childInitial.endX + deltaX,
                                                    endY: childInitial.endY + deltaY,
                                                }
                                            })
                                        )
                                    }
                                }
                            })
                        }
                    }
                }
            })
        }

        if (isMarqueeingRef.current && marqueeStartRef.current) {
            marqueeCurrentRef.current = world
            requestRender()
        }

        if (pointToPointRef.current) {
            pointToPointRef.current.currentWorld = world
            requestRender()
        }

        if (isDrawingRef.current) {
            if (draftShapeRef.current) {
                draftShapeRef.current.currentWorld = world
                requestRender()
            } else if (currentTool === 'freedraw') {
                freeDrawPointsRef.current.push(world)
            }
        }
    }

    const finalizeDrawingIfAny = (): void => {
        if (!isDrawingRef.current) return
        isDrawingRef.current = false

        if (freehandRafRef.current) {
            window.cancelAnimationFrame(freehandRafRef.current)
            freehandRafRef.current = null
        }

        const draft = draftShapeRef.current
        if (draft) {
            const x = Math.min(draft.startWorld.x, draft.currentWorld.x)
            const y = Math.min(draft.startWorld.y, draft.currentWorld.y)
            const w = Math.abs(draft.currentWorld.x - draft.startWorld.x)
            const h = Math.abs(draft.currentWorld.y - draft.startWorld.y)

            if (w > 1 && h > 1) {
                if (draft.type === 'frame') {
                    console.log('Adding frame shape: ', { x, y, w, h })
                    dispatch(addFrame({ x, y, w, h }))
                    dispatch(setTool('select'))
                } else if (draft.type === 'rect') {
                    dispatch(addRect({ x, y, w, h }))
                    dispatch(setTool('select'))
                } else if (draft.type === 'ellipse') {
                    dispatch(addEllipse({ x, y, w, h }))
                    dispatch(setTool('select'))
                } else if (draft.type === 'arrow') {
                    const snappedStart = snapToNearestEndpoint(draft.startWorld)
                    const snappedEnd = snapToNearestEndpoint(draft.currentWorld)
                    dispatch(
                        addArrow({
                            startX: snappedStart.x,
                            startY: snappedStart.y,
                            endX: snappedEnd.x,
                            endY: snappedEnd.y
                        })
                    )
                } else if (draft.type === 'line') {
                    const snappedStart = snapToNearestEndpoint(draft.startWorld)
                    const snappedEnd = snapToNearestEndpoint(draft.currentWorld)
                    dispatch(
                        addLine({
                            startX: snappedStart.x,
                            startY: snappedStart.y,
                            endX: snappedEnd.x,
                            endY: snappedEnd.y
                        })
                    )
                }
            }

            draftShapeRef.current = null
        } else if (currentTool === 'freedraw') {
            const pts = freeDrawPointsRef.current
            if (pts.length > 1) dispatch(addFreeDrawShape({ points: pts }))
            freeDrawPointsRef.current = []
        }

        requestRender()
    }

    const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
        canvasRef.current?.releasePointerCapture?.(e.pointerId)

        if (viewport.mode === 'panning' || viewport.mode === 'shiftPanning') {
            dispatch(panEnd())
        }

        if (isMovingRef.current) {
            isMovingRef.current = false
            moveStartRef.current = null
            initialShapePositionsRef.current = {}
        }

        if (isErasingRef.current) {
            isErasingRef.current = false
            erasedShapeRef.current.clear()
        }

        if (isMarqueeingRef.current && marqueeStartRef.current && marqueeCurrentRef.current) {
            isMarqueeingRef.current = false

            const x1 = Math.min(marqueeStartRef.current.x, marqueeCurrentRef.current.x)
            const y1 = Math.min(marqueeStartRef.current.y, marqueeCurrentRef.current.y)
            const x2 = Math.max(marqueeStartRef.current.x, marqueeCurrentRef.current.x)
            const y2 = Math.max(marqueeStartRef.current.y, marqueeCurrentRef.current.y)

            // Only select if dragged a meaningful distance
            if (x2 - x1 > 4 && y2 - y1 > 4) {
                shapeList.forEach((shape) => {
                    if (isShapeInMarquee(shape, x1, y1, x2, y2)) {
                        dispatch(selectShape(shape.id))
                    }
                })
            }

            marqueeStartRef.current = null
            marqueeCurrentRef.current = null
            requestRender()
        }

        finalizeDrawingIfAny()
    }

    const onPointerCancel: React.PointerEventHandler<HTMLDivElement> = (e) => {
        onPointerUp(e)
    }

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return

            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                isShiftPressedRef.current = true
                isSpacedPressed.current = true
                dispatch(handToolEnable())
            }

            const activeElement = document.activeElement
            const isTyping =
                activeElement?.tagName === 'INPUT' ||
                activeElement?.tagName === 'TEXTAREA' ||
                (activeElement as HTMLElement)?.isContentEditable

            if (isTyping) return

            const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
            const isModKey = isMac ? e.metaKey : e.ctrlKey

            // ── Tool shortcuts ────────────────────────────────────────
            const toolKeys: Record<string, Tool> = {
                v: 'select',
                h: 'pan',
                f: 'frame',
                r: 'rect',
                o: 'ellipse',
                p: 'freedraw',
                a: 'arrow',
                l: 'line',
                t: 'text',
                e: 'eraser',
            }
            if (!isModKey && toolKeys[e.key.toLowerCase()]) {
                console.log('🎯 Tool shortcut triggered:', e.key, '->', toolKeys[e.key.toLowerCase()])
                dispatch(setTool(toolKeys[e.key.toLowerCase()]))
                return
            }
            // ──────────────────────────────────────────────────────────

            if (isModKey && e.key === 'd') {
                e.preventDefault()
                dispatch(duplicateSelected())
            }

            if (isModKey && e.key === 'g') {
                e.preventDefault()
                if (e.shiftKey) dispatch(ungroupSelected())
                else dispatch(groupSelected())
            }

            if (isModKey && e.key === 'c') {
                e.preventDefault()
                const selected = Object.keys(selectedShapesRef.current)
                if (selected.length > 0) {
                    clipboardRef.current = selected
                        .map(id => entityState.entities[id])
                        .filter((s): s is Shape => Boolean(s))
                }
            }

            if (isModKey && e.key === 'v') {
                e.preventDefault()
                if (clipboardRef.current.length === 0) return

                // Temporarily select the clipboard shapes then duplicate them
                dispatch(clearSelection())
                clipboardRef.current.forEach(shape => {
                    dispatch(selectShape(shape.id))
                })
                dispatch(duplicateSelected())
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (isEditingTextRef.current) return  // text input owns this key, bail immediately
                e.preventDefault()
                const selected = Object.keys(selectedShapesRef.current)
                if (selected.length > 0) {
                    selected.forEach(id => dispatch(removeShape(id))) // delete ALL types
                    dispatch(clearSelection())
                }
            }

            if (e.key === 'Escape') {
                if (pointToPointRef.current) {
                    pointToPointRef.current = null
                    requestRender()
                    return
                }
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                isShiftPressedRef.current = false
                isSpacedPressed.current = false
                dispatch(handToolDisable())
            }
        }

        // Nuke any previously registered handlers before adding new ones
        if (_keydownHandler) document.removeEventListener('keydown', _keydownHandler, { capture: true })
        if (_keyupHandler) document.removeEventListener('keyup', _keyupHandler, { capture: true })

        _keydownHandler = handleKeyDown
        _keyupHandler = handleKeyUp

        document.addEventListener('keydown', _keydownHandler, { capture: true })
        document.addEventListener('keyup', _keyupHandler, { capture: true })

        return () => {
            if (_keydownHandler) document.removeEventListener('keydown', _keydownHandler, { capture: true })
            if (_keyupHandler) document.removeEventListener('keyup', _keyupHandler, { capture: true })
            _keydownHandler = null
            _keyupHandler = null
            if (freehandRafRef.current) window.cancelAnimationFrame(freehandRafRef.current)
            if (panRafRef.current) window.cancelAnimationFrame(panRafRef.current)
        }
    }, [dispatch])

    React.useEffect(() => {
        const handleResizeStart = (e: CustomEvent) => {
            const { shapeId, corner, bounds } = e.detail
            isResizingRef.current = true
            resizeDataRef.current = {
                shapeId,
                corner,
                initialBounds: bounds,
                startPoint: { x: e.detail.clientX || 0, y: e.detail.clientY || 0 },
                aspectRatio: bounds.h > 0 ? bounds.w / bounds.h : 1
            }
        }
        const handleResizeMove = (e: CustomEvent) => {
            if (!isResizingRef.current || !resizeDataRef.current) return
            const { shapeId, corner, initialBounds } = resizeDataRef.current
            const { clientX, clientY } = e.detail

            const canvasEl = canvasRef.current
            if (!canvasEl) return

            const rect = canvasEl.getBoundingClientRect()
            const localX = clientX - rect.left
            const localY = clientY - rect.top
            const world = screenToWorld(
                { x: localX, y: localY },
                viewport.translate,
                viewport.scale
            )
            const shape = entityState.entities[shapeId]
            if (!shape) return

            const newBounds = { ...initialBounds }
            switch (corner) {
                case 'nw':
                    newBounds.w = Math.max(
                        10,
                        initialBounds.w + (initialBounds.x - world.x)
                    )
                    newBounds.h = Math.max(
                        10,
                        initialBounds.h + (initialBounds.y - world.y)
                    )
                    newBounds.x = world.x
                    newBounds.y = world.y
                    break
                case 'ne':
                    newBounds.w = Math.max(10, world.x - initialBounds.x)
                    newBounds.h = Math.max(
                        10,
                        initialBounds.h + (initialBounds.y - world.y)
                    )
                    newBounds.y = world.y
                    break
                case 'sw':
                    newBounds.w = Math.max(
                        10,
                        initialBounds.w + (initialBounds.x - world.x)
                    )
                    newBounds.h = Math.max(10, world.y - initialBounds.y)
                    newBounds.x = world.x
                    break
                case 'se':
                    newBounds.w = Math.max(10, world.x - initialBounds.x)
                    newBounds.h = Math.max(10, world.y - initialBounds.y)
                    break
                case 'n':
                    newBounds.h = Math.max(
                        10,
                        initialBounds.h + (initialBounds.y - world.y)
                    )
                    newBounds.y = world.y
                    break
                case 's':
                    newBounds.h = Math.max(10, world.y - initialBounds.y)
                    break
                case 'e':
                    newBounds.w = Math.max(10, world.x - initialBounds.x)
                    break
                case 'w':
                    newBounds.w = Math.max(
                        10,
                        initialBounds.w + (initialBounds.x - world.x)
                    )
                    newBounds.x = world.x
                    break
            }

            // Apply aspect ratio constraint when shift is pressed
            if (isShiftPressedRef.current && (corner === 'nw' || corner === 'ne' || corner === 'sw' || corner === 'se')) {
                // Figure out which dimension changed more (proportionally)
                const wRatio = newBounds.w / initialBounds.w
                const hRatio = newBounds.h / initialBounds.h

                // Drive both axes by whichever changed more
                const dominantRatio = Math.max(wRatio, hRatio)
                const constrainedW = initialBounds.w * dominantRatio
                const constrainedH = initialBounds.h * dominantRatio

                // Re-anchor x/y for corners that pull from top or left
                switch (corner) {
                    case 'nw':
                        newBounds.x = (initialBounds.x + initialBounds.w) - constrainedW
                        newBounds.y = (initialBounds.y + initialBounds.h) - constrainedH
                        break
                    case 'ne':
                        newBounds.y = (initialBounds.y + initialBounds.h) - constrainedH
                        break
                    case 'sw':
                        newBounds.x = (initialBounds.x + initialBounds.w) - constrainedW
                        break
                    case 'se':
                        // x and y stay anchored at top-left, no adjustment needed
                        break
                }

                newBounds.w = constrainedW
                newBounds.h = constrainedH
            }

            if (
                shape.type === 'frame' ||
                shape.type === 'rect' ||
                shape.type === 'ellipse'
            ) {
                dispatch(
                    updateShape({
                        id: shapeId,
                        patch: {
                            x: newBounds.x,
                            y: newBounds.y,
                            w: newBounds.w,
                            h: newBounds.h
                        }
                    })
                )
            } else if (shape.type === 'freedraw') {
                const xs = shape.points.map((p: { x: number; y: number }) => p.x)
                const ys = shape.points.map((p: { x: number; y: number }) => p.y)
                const actualMinX = Math.min(...xs)
                const actualMaxX = Math.max(...xs)
                const actualMinY = Math.min(...ys)
                const actualMaxY = Math.max(...ys)
                const actualWidth = actualMaxX - actualMinX
                const actualHeight = actualMaxY - actualMinY

                const newActualX = newBounds.x + 5
                const newActualY = newBounds.y + 5
                const newActualWidth = Math.max(10, newBounds.w - 10)
                const newActualHeight = Math.max(10, newBounds.h - 10)

                const scaleX = actualWidth > 0 ? newActualWidth / actualWidth : 1
                const scaleY = actualHeight > 0 ? newActualHeight / actualHeight : 1

                const scaledPoints = shape.points.map(
                    (point: { x: number; y: number }) => ({
                        x: newActualX + (point.x - actualMinX) * scaleX,
                        y: newActualY + (point.y - actualMinY) * scaleY
                    })
                )

                dispatch(
                    updateShape({
                        id: shapeId,
                        patch: {
                            points: scaledPoints
                        }
                    })
                )
            } else if (shape.type === 'line' || shape.type === 'arrow') {
                const actualMinX = Math.min(shape.startX, shape.endX)
                const actualMaxX = Math.max(shape.startX, shape.endX)
                const actualMinY = Math.min(shape.startY, shape.endY)
                const actualMaxY = Math.max(shape.startY, shape.endY)
                const actualWidth = actualMaxX - actualMinX
                const actualHeight = actualMaxY - actualMinY

                const newActualX = newBounds.x + 5
                const newActualY = newBounds.y + 5
                const newActualWidth = Math.max(10, newBounds.w - 10)
                const newActualHeight = Math.max(10, newBounds.h - 10)

                let newStartX, newStartY, newEndX, newEndY
                if (actualWidth === 0) {
                    newStartX = newActualX + newActualWidth / 2
                    newEndX = newActualX + newActualWidth / 2
                    newStartY =
                        shape.startY < shape.endY
                            ? newActualY
                            : newActualY + newActualHeight
                    newEndY =
                        shape.startY < shape.endY
                            ? newActualY + newActualHeight
                            : newActualY
                } else if (actualHeight === 0) {
                    newStartY = newActualY + newActualHeight / 2
                    newEndY = newActualY + newActualHeight / 2
                    newStartX =
                        shape.startX < shape.endX ? newActualX : newActualX + newActualWidth
                    newEndX =
                        shape.startX < shape.endX ? newActualX + newActualWidth : newActualX
                } else {
                    const scaleX = newActualWidth / actualWidth
                    const scaleY = newActualHeight / actualHeight

                    newStartX = newActualX + (shape.startX - actualMinX) * scaleX
                    newStartY = newActualY + (shape.startY - actualMinY) * scaleY
                    newEndX = newActualX + (shape.endX - actualMinX) * scaleX
                    newEndY = newActualY + (shape.endY - actualMinY) * scaleY
                }

                dispatch(
                    updateShape({
                        id: shapeId,
                        patch: {
                            startX: newStartX,
                            startY: newStartY,
                            endX: newEndX,
                            endY: newEndY
                        }
                    })
                )
            }
        }

        const handleResizeEnd = () => {
            isResizingRef.current = false
            resizeDataRef.current = null
        }

        window.addEventListener(
            'shape-resize-start',
            handleResizeStart as EventListener
        )

        window.addEventListener(
            'shape-resize-move',
            handleResizeMove as EventListener
        )

        window.addEventListener(
            'shape-resize-end',
            handleResizeEnd as EventListener
        )

        return () => {
            window.removeEventListener(
                'shape-resize-start',
                handleResizeStart as EventListener
            )

            window.removeEventListener(
                'shape-resize-move',
                handleResizeMove as EventListener
            )

            window.removeEventListener(
                'shape-resize-end',
                handleResizeEnd as EventListener
            )
        }
    }, [dispatch, entityState.entities, viewport.translate, viewport.scale])

    const attachCanvasRef = (ref: HTMLDivElement | null): void => {
        // Clean up any exisiting event Listeners on the old canvas
        if (canvasRef.current) {
            canvasRef.current.removeEventListener('wheel', onWheel)
        }

        // Store the new canvas reference
        canvasRef.current = ref

        // Add wheel event listener to the new canvas (for zoom/pan)
        if (ref) {
            ref.addEventListener('wheel', onWheel, { passive: false })
            ref.focus() // gives focus immediately so shortcuts work on page load
        }
    }

    const selectTool = (tool: Tool): void => {
        dispatch(setTool(tool))
    }

    const getDraftShape = (): DraftShape | null => draftShapeRef.current
    const getFreeDrawPoints = (): ReadonlyArray<Point> =>
        freeDrawPointsRef.current

    return {
        viewport,
        shapes: shapeList,
        currentTool,
        selectedShapes,
        onPointerDown,
        onPointerCancel,
        onPointerMove,
        onPointerUp,
        attachCanvasRef,
        selectTool,
        getDraftShape,
        getFreeDrawPoints,
        isSidebarOpen,
        hasSelectedText,
        setIsSidebarOpen,
        hoveredShapeId,
        getPointToPoint: () => pointToPointRef.current,
        getMarquee: () => isMarqueeingRef.current
            ? { start: marqueeStartRef.current!, current: marqueeCurrentRef.current! }
            : null
    }
}


export const useFrame = (shape: FrameShape) => {
    const [isGenerating, setIsGenerating] = React.useState(false);
    const dispatch = useAppDispatch()

    const allShapes = useAppSelector((state) =>
        Object.values(state.shapes.shapes?.entities || {}).filter(
            (shape): shape is Shape => shape !== undefined
        )
    )

    const handleGenerateDesign = async () => {
        try {
            setIsGenerating(true)
            const snapshot = await generateFrameSnapshot(shape, allShapes)

            // Get shapes INSIDE this frame only
            const shapesInsideFrame = allShapes.filter(s =>
                s.id !== shape.id &&
                s.type !== 'frame' &&
                s.x >= shape.x && s.x + (s.w || 0) <= shape.x + shape.w &&
                s.y >= shape.y && s.y + (s.h || 0) <= shape.y + shape.h
            )

            const formData = new FormData()
            formData.append('image', snapshot, `frame-${shape.frameNumber}.png`)
            formData.append('frameNumber', shape.frameNumber.toString())
            formData.append('shapes', JSON.stringify(shapesInsideFrame))

            const urlParams = new URLSearchParams(window.location.search)
            const projectId = urlParams.get('project')
            if (projectId) {
                formData.append('projectId', projectId)
            }

            const response = await fetch('/api/generate', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: 'Unknown error' }))
                throw new Error(err.error || 'Failed to generate UI')
            }

            const generatedUIPosition = {
                x: shape.x + shape.w + 50,
                y: shape.y,
                w: Math.max(400, shape.w),
                h: Math.max(300, shape.h)
            }

            const generatedUIId = nanoid()

            dispatch(
                addGeneratedUI({
                    ...generatedUIPosition,
                    id: generatedUIId,
                    uiSpecData: null,
                    sourceFrameId: shape.id
                })
            )

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let accumulatedMarkup = ''

            let lastUpdateTime = 0
            const UPDATE_THROTTLE_MS = 200

            if (reader) {
                try {
                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) {
                            dispatch(
                                updateShape({
                                    id: generatedUIId,
                                    patch: {
                                        uiSpecData: accumulatedMarkup,
                                    }
                                })
                            )
                            break
                        }

                        const chunk = decoder.decode(value)
                        accumulatedMarkup += chunk

                        const now = Date.now()
                        if (now - lastUpdateTime >= UPDATE_THROTTLE_MS) {
                            dispatch(
                                updateShape({
                                    id: generatedUIId,
                                    patch: {
                                        uiSpecData: accumulatedMarkup,
                                    }
                                })
                            )
                            lastUpdateTime = now
                        }
                    }
                } finally {
                    reader.releaseLock()
                }
            }

        } catch (error) {
            toast.error(`Failed to generate: ${error instanceof Error ? error.message : 'Unknown error'}`)
        } finally {
            setIsGenerating(false)
        }
    }

    return {
        isGenerating,
        handleGenerateDesign
    }
}

export const useInspiration = () => {
    const [isinspirationOpen, setIsInspirationOpen] = React.useState(false)

    const toggleInspiration = () => {
        setIsInspirationOpen(!isinspirationOpen)
    }

    const openInspiration = () => {
        setIsInspirationOpen(true)
    }

    const closeInspiration = () => {
        setIsInspirationOpen(false)
    }

    return {
        isinspirationOpen,
        toggleInspiration,
        openInspiration,
        closeInspiration,
    }
}

export const useWorkflowGeneration = () => {
    const dispatch = useAppDispatch()
    const [, { isLoading: isGeneratingWorkflow }] = useGenerateWorkflowMutation()

    const allShapes = useAppSelector((state) =>
        Object.values(state.shapes.shapes?.entities || {}).filter(
            (shape): shape is Shape => shape !== undefined
        )
    )

    const generateWorkflow = async (generatedUIId: string) => {
        try {
            const currentShape = allShapes.find((shape) => shape.id === generatedUIId)

            if (!currentShape || currentShape.type !== 'generatedui') {
                toast.error("Generated UI not found")
                return
            }

            if (!currentShape.uiSpecData) {
                toast.error("No design data to generate workflow")
                return
            }

            const urlParams = new URLSearchParams(window.location.search)

            const projectId = urlParams.get('project')

            if (!projectId) {
                toast.error("Project ID not found")
                return
            }

            const pageCount = 4
            toast.loading("Generate workflow pages...", {
                id: 'workflow-generation',
            })

            const baseX = currentShape.x + currentShape.w + 100
            const spacing = Math.max(currentShape.w + 50, 450)

            const workflowPromises = Array.from({ length: pageCount }).map(
                async (_, index) => {
                    try {
                        const response = await fetch('/api/generate/workflow', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                currentHTML: currentShape.uiSpecData,
                                projectId,
                                pageIndex: index,
                                generatedUIId
                            })
                        })

                        if (!response.ok) {
                            throw new Error(
                                `Failed to generate page ${index + 1}: ${response.status}`
                            )
                        }

                        const workflowPosition = {
                            x: baseX + index * spacing,
                            y: currentShape.y,
                            w: Math.max(400, currentShape.w),
                            h: Math.max(300, currentShape.h),
                        }

                        const workflowId = nanoid()

                        dispatch(
                            addGeneratedUI({
                                ...workflowPosition,
                                id: workflowId,
                                uiSpecData: null,
                                sourceFrameId: currentShape.sourceFrameId,
                                isWorkflowPage: true
                            })
                        )

                        const reader = response.body?.getReader()
                        const decoder = new TextDecoder()
                        let accumulatedHTML = ''

                        if (reader) {
                            while (true) {
                                const { done, value } = await reader.read()
                                if (done) break

                                const chunk = decoder.decode(value)
                                accumulatedHTML += chunk

                                dispatch(
                                    updateShape({
                                        id: workflowId,
                                        patch: {
                                            uiSpecData: accumulatedHTML
                                        }
                                    })
                                )
                            }
                        }
                        return { pageIndex: index, success: true }

                    } catch (error) {
                        console.error(`Failed to generate page ${index + 1}:`, error)
                        return { pageIndex: index, success: false, error }
                    }
                }
            )

            const results = await Promise.all(workflowPromises)
            const successCount = results.filter((r) => r.success).length

            if (successCount === 4) {
                toast.success("Workflow generated successfully", {
                    id: 'workflow-generation',
                })
            } else {
                toast.error(`Generated ${successCount} out of 4 workflow pages`, {
                    id: 'workflow-generation',
                })
            }
        } catch (error) {
            toast.error(`Failed to generate workflow: ${error instanceof Error ? error.message : 'Unknown error'}`)
        } finally {
            toast.dismiss('workflow-generation')
        }
    }
    return {
        generateWorkflow,
        isGeneratingWorkflow
    }
}

export interface ChatTurn {
    id: string
    prompt: string
    response: string
    isLoading: boolean
    timestamp: number
    urls?: string[]   // ← NEW: reference URLs attached when the prompt was sent
}

/**
 * Client event format from /api/chat stream.
 */
interface ChatStreamEvent {
    type: 'text' | 'html' | 'error' | 'styleguide' | 'done'
    text?: string
    tokens?: StyleTokens
}

/**
 * Parses multiplexed SSE stream from /api/chat.
 * Each line is "data: {...}" with a complete event.
 */
async function consumeChatStream(
    res: Response,
    onText: (chunk: string) => void,
    onHTML: (chunk: string) => void,
    onError: (msg: string) => void,
    onDone: () => void,
    onStyleGuide?: (tokens: StyleTokens) => void
) {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Split on newlines, each "data: {...}" is one line
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // keep incomplete last line

        for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data: ')) continue

            try {
                const event = JSON.parse(trimmed.slice(6)) as ChatStreamEvent
                if (event.type === 'text') onText(event.text ?? '')
                else if (event.type === 'html') onHTML(event.text ?? '')
                else if (event.type === 'error') onError(event.text ?? '')
                else if (event.type === 'styleguide' && event.tokens && onStyleGuide) {
                    onStyleGuide(event.tokens)
                }
                else if (event.type === 'done') onDone()
            } catch {
                // malformed chunk, skip
            }
        }
    }
}

/**
 * Renders a style guide card as HTML for display on the canvas
 */
function buildStyleGuideHTML(tokens: StyleTokens): string {
    const swatchEntries = Object.entries(tokens.colors)

    const hexToRgb = (hex: string) => ({
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16),
    })

    const isLight = (hex: string) => {
        const { r, g, b } = hexToRgb(hex)
        return (r * 299 + g * 587 + b * 114) / 1000 > 150
    }

    const gradientBars = (hex: string) => {
        const { r, g, b } = hexToRgb(hex)
        const light = isLight(hex)
        return Array.from({ length: 8 }, (_, i) => {
            const d = light ? i / 8 : (7 - i) / 8
            const nr = Math.round(r + (light ? -r : 255 - r) * d * 0.8)
            const ng = Math.round(g + (light ? -g : 255 - g) * d * 0.8)
            const nb = Math.round(b + (light ? -b : 255 - b) * d * 0.8)
            return `<div style="flex:1;height:8px;border-radius:2px;background:rgb(${nr},${ng},${nb})"></div>`
        }).join('')
    }

    const swatchCard = ([name, hex]: [string, string]) => {
        const light = isLight(hex)
        const labelColor = light ? '#333' : '#fff'
        const hexColor = light ? '#999' : 'rgba(255,255,255,0.45)'
        const border = light ? 'border:0.5px solid #ddd;' : ''
        const label = name.replace(/([A-Z])/g, ' $1').trim()
        return `
      <div style="background:${hex};border-radius:10px;padding:10px 12px;${border}">
        <div style="font-size:10px;font-weight:600;color:${labelColor};margin-bottom:6px;display:flex;justify-content:space-between;">
          <span style="text-transform:capitalize">${label}</span>
          <span style="font-family:monospace;opacity:0.6">${hex}</span>
        </div>
        <div style="display:flex;gap:2px">${gradientBars(hex)}</div>
      </div>`
    }

    const primary = tokens.colors.primary
    const bg = tokens.colors.background
    const fg = tokens.colors.foreground
    const font = tokens.fonts.sans
    const radius = tokens.radius

    return `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'${font}',-apple-system,sans-serif; background:#EFEFEF; padding:20px; }
  .grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:8px; }
  .cell { background:#fff; border-radius:10px; padding:14px 12px; border:0.5px solid #e8e8e8; }
  .cell-dark { background:${fg}; border-radius:10px; padding:14px 12px; }
  .label { font-size:10px; color:#999; }
  .label-pair { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
</style>
</head>
<body>

<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="#888" stroke-width="1.2"/><path d="M5 9h8M9 5v8" stroke="#888" stroke-width="1.2" stroke-linecap="round"/></svg>
  <span style="font-size:14px;font-weight:600;color:#111;">${font} &middot; ${radius}</span>
</div>

<div class="grid">

  <!-- COL 1: Color swatches -->
  <div style="display:flex;flex-direction:column;gap:8px;">
    ${swatchEntries.slice(0, 4).map(swatchCard).join('')}
    ${swatchEntries.slice(4).map(swatchCard).join('')}
  </div>

  <!-- COL 2: Typography -->
  <div style="display:flex;flex-direction:column;gap:8px;">
    <div class="cell" style="flex:1">
      <div class="label-pair"><span class="label">Headline</span><span class="label">${font}</span></div>
      <div style="font-size:52px;font-weight:300;color:#333;line-height:1;letter-spacing:-2px;">Aa</div>
    </div>
    <div class="cell" style="flex:1">
      <div class="label-pair"><span class="label">Body</span><span class="label">${font}</span></div>
      <div style="font-size:44px;font-weight:400;color:#888;line-height:1;">Aa</div>
    </div>
    <div class="cell" style="flex:1">
      <div class="label-pair"><span class="label">Label</span><span class="label">${font}</span></div>
      <div style="font-size:38px;font-weight:500;color:#bbb;line-height:1;">Aa</div>
    </div>
  </div>

  <!-- COL 3: Button variants + divider + label chip -->
  <div style="display:flex;flex-direction:column;gap:8px;">
    <div class="cell">
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        <button style="background:${primary};color:${bg};border:none;border-radius:6px;padding:5px 12px;font-size:11px;font-weight:600;">Primary</button>
        <button style="background:${bg};color:${fg};border:none;border-radius:6px;padding:5px 12px;font-size:11px;font-weight:600;">Secondary</button>
        <button style="background:${fg};color:${bg};border:none;border-radius:6px;padding:5px 12px;font-size:11px;font-weight:600;">Inverted</button>
        <button style="background:transparent;color:${fg};border:1px solid ${fg};border-radius:6px;padding:5px 12px;font-size:11px;font-weight:600;">Outlined</button>
      </div>
    </div>
    <div class="cell" style="display:flex;flex-direction:column;gap:5px;justify-content:center;min-height:60px;">
      <div style="height:2px;background:${fg};border-radius:2px;"></div>
      <div style="height:2px;background:${fg};border-radius:2px;width:70%;"></div>
      <div style="height:2px;background:${fg};border-radius:2px;width:85%;"></div>
    </div>
    <div class="cell" style="display:flex;align-items:center;gap:8px;">
      <div style="width:30px;height:30px;background:${primary};border-radius:${radius};display:flex;align-items:center;justify-content:center;">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 10l2.5-2.5L7 10l4.5-4.5" stroke="${bg}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div style="background:${primary};color:${bg};border-radius:${radius};padding:4px 10px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px;">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 8l2-2 2 2 4-4" stroke="${bg}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Label
      </div>
    </div>
  </div>

  <!-- COL 4: Search + Nav + Actions -->
  <div style="display:flex;flex-direction:column;gap:8px;">
    <div class="cell">
      <div style="display:flex;align-items:center;gap:6px;background:#f5f5f7;border-radius:7px;padding:7px 10px;">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="3.5" stroke="#999" stroke-width="1.2"/><path d="M8 8l2 2" stroke="#999" stroke-width="1.2" stroke-linecap="round"/></svg>
        <span style="font-size:11px;color:#aaa;">Search</span>
      </div>
    </div>
    <div class="cell" style="display:flex;justify-content:space-around;align-items:center;min-height:56px;">
      <div style="width:30px;height:30px;background:${primary};border-radius:50%;display:flex;align-items:center;justify-content:center;">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 11V7L7 2.5 12 7v4a1 1 0 01-1 1H3a1 1 0 01-1-1z" stroke="${bg}" stroke-width="1.3"/></svg>
      </div>
      <div style="width:30px;height:30px;background:#f0f0f0;border-radius:50%;display:flex;align-items:center;justify-content:center;">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="3.5" stroke="#666" stroke-width="1.2"/><path d="M8 8l2 2" stroke="#666" stroke-width="1.2" stroke-linecap="round"/></svg>
      </div>
      <div style="width:30px;height:30px;background:#f0f0f0;border-radius:50%;display:flex;align-items:center;justify-content:center;">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="5" r="2" stroke="#666" stroke-width="1.2"/><path d="M2 12c0-2.2 2-4 4.5-4S11 9.8 11 12" stroke="#666" stroke-width="1.2" stroke-linecap="round"/></svg>
      </div>
    </div>
    <div class="cell" style="display:flex;justify-content:space-around;align-items:center;min-height:56px;">
      <div style="width:30px;height:30px;background:${primary};border-radius:50%;display:flex;align-items:center;justify-content:center;">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 8l2-2 2 2 4-4" stroke="${bg}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div style="width:30px;height:30px;background:${primary};border-radius:50%;display:flex;align-items:center;justify-content:center;">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="1.2" fill="${bg}"/><circle cx="2" cy="6" r="1.2" fill="${bg}"/><circle cx="10" cy="6" r="1.2" fill="${bg}"/></svg>
      </div>
      <div style="width:30px;height:30px;background:${primary};border-radius:50%;display:flex;align-items:center;justify-content:center;">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 6.5l3 2.5 6-6" stroke="${bg}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div style="width:30px;height:30px;background:#e33;border-radius:50%;display:flex;align-items:center;justify-content:center;">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>
      </div>
    </div>
  </div>

</div>
</body>
</html>`
}

export const useGlobalChat = () => {
    const dispatch = useAppDispatch()
    const [activeGeneratedUIId, setActiveGeneratedUIId] = React.useState<string | null>(null)
    const [chatTurns, setChatTurns] = React.useState<ChatTurn[]>([])
    const [expandedTurnId, setExpandedTurnId] = React.useState<string | null>(null)
    const [isSending, setIsSending] = React.useState(false)
    const isSendingRef = React.useRef(false)
    const [isLoadingHistory, setIsLoadingHistory] = React.useState(true)
    const hasInitRef = React.useRef(false)
    const { generateWorkflow } = useWorkflowGeneration()

    const allShapes = useAppSelector((state) =>
        Object.values(state.shapes.shapes?.entities || {}).filter(
            (s): s is Shape => s !== undefined
        )
    )

    /**
     * Load chat history from Convex on mount
     */
    const loadHistory = React.useCallback(async (projectId: string) => {
        try {
            const res = await fetch(`/api/chat/turns?projectId=${projectId}`)
            if (!res.ok) return
            const saved = await res.json()
            if (saved.length > 0) {
                setChatTurns(
                    saved.map((t: any) => ({
                        id: t.turnId,
                        prompt: t.prompt,
                        response: t.response,
                        isLoading: false,
                        timestamp: t.timestamp,
                        urls: t.urls ?? [],
                    }))
                )
                hasInitRef.current = true // Don't re-fire prompt if history exists
            }
        } catch (e) {
            console.error('Failed to load chat history', e)
        } finally {
            setIsLoadingHistory(false)
        }
    }, [])

    /**
     * Save a completed turn to Convex
     */
    const saveTurn = React.useCallback(
        async (projectId: string, turn: ChatTurn) => {
            try {
                await fetch('/api/chat/turns', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectId,
                        turnId: turn.id,
                        prompt: turn.prompt,
                        response: turn.response,
                        timestamp: turn.timestamp,
                        urls: turn.urls ?? [],
                    }),
                })
            } catch (e) {
                console.error('Failed to save chat turn', e)
            }
        },
        []
    )

    /**
     * Core: send a message via /api/chat, handle multiplexed SSE stream.
     * Streams text to chat panel, HTML to canvas shape.
     */
    const sendMessage = React.useCallback(
        async (
            prompt: string,
            projectId: string,
            opts?: { urls?: string[]; targetShapeId?: string; isInit?: boolean }
        ) => {
            if (isSendingRef.current) return
            isSendingRef.current = true
            setIsSending(true)

            const turnId = crypto.randomUUID()
            const targetId = opts?.targetShapeId ?? activeGeneratedUIId
            const timestamp = Date.now()

            // Optimistically add the turn
            setChatTurns((prev) => [
                ...(opts?.isInit ? [] : prev),
                {
                    id: turnId,
                    prompt,
                    response: '',
                    isLoading: true,
                    timestamp,
                    urls: opts?.urls,
                },
            ])
            setExpandedTurnId(turnId)

            // Create a canvas shape to stream HTML into if we have a target
            let shapeId = targetId
            let htmlBuffer = ''
            let lastShapeUpdate = 0
            const HTML_THROTTLE_MS = 150
            let fullResponse = ''

            const flushHTML = (final = false) => {
                if (!shapeId || !htmlBuffer) return
                const now = Date.now()
                if (final || now - lastShapeUpdate >= HTML_THROTTLE_MS) {
                    dispatch(
                        updateShape({ id: shapeId, patch: { uiSpecData: htmlBuffer } })
                    )
                    lastShapeUpdate = now
                }
            }

            try {
                // Get current HTML if we're editing an existing shape
                const currentShape = targetId
                    ? allShapes.find((s) => s.id === targetId)
                    : null
                const currentHTML =
                    currentShape?.type === 'generatedui'
                        ? currentShape.uiSpecData ?? undefined
                        : undefined

                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, projectId, currentHTML }),
                })

                if (!res.ok) throw new Error('Chat request failed')

                let shapeCreated = false

                await consumeChatStream(
                    res,
                    // onText → stream into chat panel
                    (chunk) => {
                        fullResponse += chunk
                        setChatTurns((prev) =>
                            prev.map((t) =>
                                t.id === turnId
                                    ? { ...t, response: t.response + chunk }
                                    : t
                            )
                        )
                    },
                    // onHTML → stream into canvas shape
                    (chunk) => {
                        if (!shapeCreated && !shapeId) {
                            // Create a new shape on first HTML chunk
                            const newId = nanoid()
                            dispatch(
                                addGeneratedUI({
                                    x: 200,
                                    y: 200,
                                    w: 1200,
                                    h: 900,
                                    id: newId,
                                    uiSpecData: null,
                                    sourceFrameId: null,
                                    prompt,
                                })
                            )
                            shapeId = newId
                            setActiveGeneratedUIId(newId)
                            shapeCreated = true
                        }
                        htmlBuffer += chunk
                        flushHTML()
                    },
                    // onError
                    (msg) => {
                        setChatTurns((prev) =>
                            prev.map((t) =>
                                t.id === turnId
                                    ? { ...t, response: t.response + `\n\n⚠️ ${msg}`, isLoading: false }
                                    : t
                            )
                        )
                    },
                    // onDone — persist completed turn
                    () => {
                        flushHTML(true)
                        setChatTurns((prev) =>
                            prev.map((t) => {
                                if (t.id === turnId) {
                                    const completed = { ...t, isLoading: false }
                                    // Persist to Convex
                                    saveTurn(projectId, completed)
                                    return completed
                                }
                                return t
                            })
                        )
                    },
                    // onStyleGuide — render style guide frame to the left of the generated UI
                    (tokens) => {
                        const sgId = nanoid()
                        const sgHTML = buildStyleGuideHTML(tokens)
                        dispatch(
                            addGeneratedUI({
                                id: sgId,
                                x: -420,
                                y: 200,
                                w: 380,
                                h: 520,
                                uiSpecData: sgHTML,
                                sourceFrameId: null,
                            })
                        )
                    }
                )
            } catch (err) {
                console.error('Chat failed:', err)
                setChatTurns((prev) =>
                    prev.map((t) =>
                        t.id === turnId
                            ? {
                                ...t,
                                response: 'Something went wrong. Please try again.',
                                isLoading: false,
                            }
                            : t
                    )
                )
            } finally {
                isSendingRef.current = false
                setIsSending(false)
            }
        },
        [activeGeneratedUIId, dispatch, allShapes, saveTurn]
    )

    const projectMetadata = useAppSelector((s) => s.project)

    const initFromUrlPrompt = React.useCallback(
        async (
            prompt: string,
            projectId: string,
            onStream: (html: string) => void,
            onDone: () => void
        ) => {
            if (hasInitRef.current) return
            hasInitRef.current = true

            // Get reference URLs from Redux project metadata
            const referenceUrls = projectMetadata.referenceUrls ?? []

            // Delegate to sendMessage with isInit flag and referenceUrls
            await sendMessage(prompt, projectId, { isInit: true, urls: referenceUrls })

            // Note: The actual HTML streaming happens via the canvas dispatch,
            // but for the init flow's onStream callback, we'd need to
            // intercept the dispatch. For now, call onDone immediately
            // since the shape updates are handled by sendMessage's dispatch calls
            onDone()
        },
        [hasInitRef, sendMessage, projectMetadata.referenceUrls]
    )

    return {
        activeGeneratedUIId,
        setActiveGeneratedUIId,
        chatTurns,
        expandedTurnId,
        setExpandedTurnId,
        isSending,
        isLoadingHistory,
        loadHistory,
        initFromUrlPrompt,
        sendMessage,
        generateWorkflow,
    }
}