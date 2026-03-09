"use client"

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
    ungroupSelected
} from "@/redux/slice/shapes"
import { handToolDisable, handToolEnable, panEnd, panMove, panStart, Point, screenToWorld, wheelPan, wheelZoom } from "@/redux/slice/viewport"
import { AppDispatch, useAppSelector } from "@/redux/store"
import { RefreshCcwDot } from "lucide-react"
import { getRSCModuleInformation } from "next/dist/build/analysis/get-page-static-info"
import React from "react"
import { useDispatch } from "react-redux"


const RAF_INTERNAL_MS = 8

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

    const currentTool = useAppSelector((s) => s.shapes.tool)
    const selectedShapes = useAppSelector((s) => s.shapes.selected)

    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
    const shapesEntities = useAppSelector((state) => state.shapes.shapes.entities)

    const hasSelectedText = Object.keys(selectedShapes).some((id) => {
        const shape = shapesEntities[id]
        return shape?.type === 'text'
    })

    React.useEffect(() => {
        if (hasSelectedText && !isSidebarOpen) {
            setIsSidebarOpen(true)
        } else if (!hasSelectedText) {
            setIsSidebarOpen(false)
        }
    }, [hasSelectedText, isSidebarOpen])

    const canvasRef = React.useRef<HTMLDivElement | null>(null)
    const touchMapRef = React.useRef<Map<number, TouchPointer>>(new Map())

    const draftShapeRef = React.useRef<DraftShape | null>(null)
    const freeDrawPointsRef = React.useRef<Point[]>([])

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
    const resizeDataRef = React.useRef<{
        shapeId: string
        corner: string
        initialBounds: { x: number; y: number; w: number; h: number }
        startPoint: { x: number; y: number }
    } | null>(null)

    const lastFreehandFrameRef = React.useRef(0)
    const freehandRafRef = React.useRef<number | null>(null)
    const panRafRef = React.useRef<number | null>(null)
    const pendingPanPointRef = React.useRef<Point | null>(null)

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
                const textWidth = Math.max(
                    shape.text.length * (shape.fontSize * 0.6),
                    100
                )

                const textHeight = shape.fontSize * 1.2
                const padding = 8

                return (
                    point.x >= shape.x - 2 &&
                    point.x <= shape.x + textWidth + padding + 2 &&
                    point.y >= shape.y - 2 &&
                    point.y <= shape.y + textHeight + padding + 2
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

        // Let double-clicks on text shapes through for editing
        if (e.detail === 2 && target.closest('[data-text-shape]')) return

        const isButton =
            target.tagName === "BUTTON" ||
            target.closest('button')

        if (!isButton) {
            e.preventDefault
        } else {
            console.log(
                'Not preventing default - clicked an interactive element',
                target
            )
            return
        }

        const local = getLocalPointFromPtr(e.nativeEvent)
        const world = screenToWorld(local, viewport.translate, viewport.scale)

        if (touchMapRef.current.size <= 1) {
            canvasRef.current?.setPointerCapture?.(e.pointerId)
            const isPanButton = e.button === 1 || e.button === 2
            const panByShift = isSpacedPressed.current && e.button === 0

            if (isPanButton || panByShift) {
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

                        if (
                            hitShape.type === 'frame' ||
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
                        if (!e.shiftKey) {
                            dispatch(clearSelection())
                            blurActiveTextInput()
                        }
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
                } else {
                    isDrawingRef.current = true
                    if (
                        currentTool === 'frame' ||
                        currentTool === 'rect' ||
                        currentTool === 'ellipse' ||
                        currentTool === 'arrow' ||
                        currentTool === 'line'
                    ) {
                        console.log('Starting to draw: ', currentTool, 'at: ', world)
                        draftShapeRef.current = {
                            type: currentTool,
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
                } else if (draft.type === 'rect') {
                    dispatch(addRect({ x, y, w, h }))
                } else if (draft.type === 'ellipse') {
                    dispatch(addEllipse({ x, y, w, h }))
                } else if (draft.type === 'arrow') {
                    dispatch(
                        addArrow({
                            startX: draft.startWorld.x,
                            startY: draft.startWorld.y,
                            endX: draft.currentWorld.x,
                            endY: draft.currentWorld.y
                        })
                    )
                } else if (draft.type === 'line') {
                    dispatch(
                        addLine({
                            startX: draft.startWorld.x,
                            startY: draft.startWorld.y,
                            endX: draft.currentWorld.x,
                            endY: draft.currentWorld.y
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

        finalizeDrawingIfAny()
    }

    const onPointerCancel: React.PointerEventHandler<HTMLDivElement> = (e) => {
        onPointerUp(e)
    }

    const onKeyDown = (e: globalThis.KeyboardEvent): void => {
        if ((e.code === 'ShiftKey' || e.code === 'ShiftRight' && !e.repeat)) {
            e.preventDefault()
            isSpacedPressed.current = true
            dispatch(handToolEnable())
        }
        
        // Group/Ungroup shortcuts
        if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
            e.preventDefault()
            if (e.shiftKey) dispatch(ungroupSelected())
            else dispatch(groupSelected())
        }
    }

    const onKeyUp = (e: globalThis.KeyboardEvent): void => {
        if ((e.code === 'ShiftKey' || e.code === 'ShiftRight')) {
            e.preventDefault()
            isSpacedPressed.current = false
            dispatch(handToolDisable())
        }
    }

    React.useEffect(() => {
        document.addEventListener('keydown', onKeyDown)
        document.addEventListener('keyup', onKeyUp)
        return () => {
            document.removeEventListener('keydown', onKeyDown)
            document.removeEventListener('keyup', onKeyUp)
            if (freehandRafRef.current)
                window.cancelAnimationFrame(freehandRafRef.current)
            if (panRafRef.current) window.cancelAnimationFrame(panRafRef.current)
        }
    }, [])


    React.useEffect(() => {
        const handleResizeStart = (e: CustomEvent) => {
            const { shapeId, corner, bounds } = e.detail
            isResizingRef.current = true
            resizeDataRef.current = {
                shapeId,
                corner,
                initialBounds: bounds,
                startPoint: { x: e.detail.clientX || 0, y: e.detail.clientY || 0 }
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
        setIsSidebarOpen
    }
}