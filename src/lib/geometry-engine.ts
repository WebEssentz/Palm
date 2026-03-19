// lib/geometry-engine.ts

export interface BoundingBox {
    id: string
    x: number
    y: number
    w: number
    h: number
    centerX: number
    centerY: number
    right: number
    bottom: number
    semantic?: string
    content?: string
    _hasParent?: boolean
}

export interface Constraint {
    type:
        | 'centered-x'
        | 'centered-y'
        | 'aligned-left'
        | 'aligned-right'
        | 'aligned-top'
        | 'full-width'
        | 'below'
        | 'above'
        | 'beside-right'
    reference?: string
    gap?: number
}

export interface ConstraintNode {
    id: string
    semantic: string
    content?: string
    constraints: Constraint[]
    layout: {
        type: 'flex-row' | 'flex-col' | 'grid' | 'absolute'
        justify?: string
        align?: string
        gap?: number
        padding?: string
        fullWidth?: boolean
    }
    children: ConstraintNode[]
    visual?: {
        bg?: string
        textColor?: string
        border?: string
        radius?: string
        shadow?: boolean
        glassmorphism?: boolean
        theme?: 'dark' | 'light'
    }
    _hasParent?: boolean
}

const TOLERANCE = 10

export function shapesToBoundingBoxes(
    shapes: any[],
    frame: any
): BoundingBox[] {
    return shapes
        .filter(s => s.type !== 'frame')
        .map(s => {
            const x = s.x - frame.x
            const y = s.y - frame.y
            const w = s.w || 0
            const h = s.h || 0
            return {
                id: s.id,
                x, y, w, h,
                centerX: x + w / 2,
                centerY: y + h / 2,
                right: x + w,
                bottom: y + h,
                semantic: s.label,
                content: s.content,
            }
        })
        .sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x)
}

export function detectAlignments(
    boxes: BoundingBox[],
    containerW: number
): ConstraintNode[] {
    const used = new Set<string>()
    const groups: ConstraintNode[] = []

    for (const box of boxes) {
        if (used.has(box.id)) continue

        const rowBuddies = boxes.filter(b =>
            !used.has(b.id) &&
            Math.abs(b.centerY - box.centerY) < TOLERANCE
        ).sort((a, b) => a.x - b.x)

        rowBuddies.forEach(b => used.add(b.id))

        if (rowBuddies.length === 1) {
            groups.push(buildSingleNode(box, containerW))
        } else {
            groups.push(buildRowGroup(rowBuddies, containerW))
        }
    }

    return groups
}

function buildSingleNode(
    box: BoundingBox,
    containerW: number
): ConstraintNode {
    const constraints: Constraint[] = []

    if (box.w > containerW * 0.85) {
        constraints.push({ type: 'full-width' })
    }

    const distFromCenter = Math.abs(box.centerX - containerW / 2)
    if (distFromCenter < TOLERANCE * 2) {
        constraints.push({ type: 'centered-x' })
    }

    if (box.x < TOLERANCE * 2) {
        constraints.push({ type: 'aligned-left' })
    }

    return {
        id: box.id,
        semantic: box.semantic || inferSemanticFromBox(box, containerW),
        content: box.content,
        constraints,
        layout: {
            type: 'flex-col',
            fullWidth: box.w > containerW * 0.85,
            align: distFromCenter < TOLERANCE * 2 ? 'center' : 'flex-start',
        },
        children: [],
    }
}

function buildRowGroup(
    boxes: BoundingBox[],
    containerW: number
): ConstraintNode {
    const groupRight = boxes[boxes.length - 1].right
    const groupX = boxes[0].x
    const groupW = groupRight - groupX
    const groupY = boxes[0].centerY

    const constraints: Constraint[] = []

    if (groupW > containerW * 0.85) {
        constraints.push({ type: 'full-width' })
    }

    const gaps = boxes.slice(1).map((b, i) => b.x - boxes[i].right)
    const avgGap = gaps.length
        ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
        : 0

    const isSpaceBetween =
        boxes[0].x < TOLERANCE * 2 &&
        containerW - boxes[boxes.length - 1].right < TOLERANCE * 2

    return {
        id: `row-${boxes[0].id}`,
        semantic: inferGroupSemantic(boxes, containerW, groupY),
        constraints,
        layout: {
            type: 'flex-row',
            justify: isSpaceBetween ? 'space-between' : 'flex-start',
            align: 'center',
            gap: avgGap > 0 ? avgGap : 12,
            fullWidth: groupW > containerW * 0.85,
        },
        children: boxes.map(b => buildSingleNode(b, containerW)),
    }
}

function inferSemanticFromBox(box: BoundingBox, containerW: number): string {
    const isFullWidth = box.w > containerW * 0.85
    const isNarrow = box.w < containerW * 0.25
    const isShort = box.h < 60
    const isTall = box.h > 300

    if (isFullWidth && box.y < 80) return 'nav-bar'
    if (isFullWidth && isShort) return 'banner'
    if (isFullWidth && isTall) return 'hero'
    if (isNarrow && isTall) return 'sidebar'
    if (isShort && box.w < 200) return 'button-primary'
    if (isShort && box.w > 300) return 'data-entry'
    return 'surface-container'
}

function inferGroupSemantic(
    boxes: BoundingBox[],
    containerW: number,
    y: number
): string {
    const isTop = y < 80
    const hasSmallItems = boxes.every(b => b.w < 200 && b.h < 60)

    if (isTop) return 'nav-bar'
    if (hasSmallItems && boxes.length <= 3) return 'cta-group'
    if (boxes.length >= 3) return 'grid'
    return 'flex-row-group'
}

export function constraintsToPalmIR(
    nodes: ConstraintNode[],
    frame: any,
    styleTokens: any
) {
    return {
        version: '1.0-beta',
        source: 'geometry-engine',
        canvas: {
            width: frame.w,
            height: 'auto',
            theme: 'light'
        },
        tokens: styleTokens,
        components: nodes
    }
}