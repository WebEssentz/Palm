import type { Shape } from '@/redux/slice/shapes'

export interface ShapeBounds {
    x: number
    y: number
    w: number
    h: number
}

export interface CanvasContentBounds {
    minX: number
    minY: number
    maxX: number
    maxY: number
    width: number
    height: number
    centerX: number
    centerY: number
}

export interface ViewportRect {
    x1: number
    y1: number
    x2: number
    y2: number
    w: number
    h: number
}

/**
 * Calculates the bounding box of a single shape in world coordinates.
 */
export function getShapeBounds(shape: Shape): ShapeBounds {
    if (!shape) return { x: 0, y: 0, w: 0, h: 0 }

    if (shape.type === 'freedraw') {
        if (!shape.points || shape.points.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const p of shape.points) {
            if (p.x < minX) minX = p.x
            if (p.y < minY) minY = p.y
            if (p.x > maxX) maxX = p.x
            if (p.y > maxY) maxY = p.y
        }
        return {
            x: minX,
            y: minY,
            w: Math.max(maxX - minX, 4),
            h: Math.max(maxY - minY, 4),
        }
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

/**
 * Computes the collective bounding box of all shapes on the canvas.
 */
export function getAllShapesBounds(shapes: Shape[]): CanvasContentBounds | null {
    if (!shapes || shapes.length === 0) return null

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    let count = 0

    for (const shape of shapes) {
        if (!shape) continue
        const b = getShapeBounds(shape)
        if (!Number.isFinite(b.x) || !Number.isFinite(b.y)) continue
        if (b.x < minX) minX = b.x
        if (b.y < minY) minY = b.y
        if (b.x + b.w > maxX) maxX = b.x + b.w
        if (b.y + b.h > maxY) maxY = b.y + b.h
        count++
    }

    if (count === 0 || !Number.isFinite(minX) || !Number.isFinite(minY)) return null

    return {
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(maxX - minX, 10),
        height: Math.max(maxY - minY, 10),
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
    }
}

/**
 * Checks whether a shape's bounding box intersects the visible viewport rectangle.
 */
export function shapeIntersectsViewport(
    b: ShapeBounds,
    vp: ViewportRect
): boolean {
    return !(
        vp.x2 < b.x ||
        vp.x1 > b.x + b.w ||
        vp.y2 < b.y ||
        vp.y1 > b.y + b.h
    )
}
