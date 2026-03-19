import { BoundingBox, ConstraintNode, shapesToBoundingBoxes, detectAlignments } from './geometry-engine'
import { extractAllDNA, VisualDNA } from './visual-dna'

// Inject visual DNA into constraint nodes
function injectDNA(
    nodes: ConstraintNode[],
    dnaMap: Map<string, VisualDNA>
): ConstraintNode[] {
    return nodes.map(node => {
        const dna = dnaMap.get(node.id)
        return {
            ...node,
            visual: dna ? {
                bg: dna.bg,
                textColor: dna.textColor,
                border: dna.borderColor 
                    ? `1px solid ${dna.borderColor}` 
                    : undefined,
                radius: dna.radius,
                theme: dna.theme,
            } : node.visual,
            children: node.children.length
                ? injectDNA(node.children, dnaMap)
                : node.children
        }
    })
}

// Detect overall theme from canvas background
function detectCanvasTheme(dnaMap: Map<string, VisualDNA>): 'dark' | 'light' {
    const themes = Array.from(dnaMap.values()).map(d => d.theme)
    const darkCount = themes.filter(t => t === 'dark').length
    return darkCount > themes.length / 2 ? 'dark' : 'light'
}

// ── Main compiler function ─────────────────────────────────────
// Takes Redux shapes + frame snapshot image
// Returns complete PalmIR with structure + visuals

export async function compileToPalmIR(
    shapes: any[],
    frame: any,
    imageBuffer: Buffer,        // frame snapshot for DNA extraction
    styleTokens: any
) {
    // Step 1 — geometry engine: pure math, zero AI
    const boxes = shapesToBoundingBoxes(shapes, frame)
    const constraintNodes = detectAlignments(boxes, frame.w)

    // Step 2 — visual DNA: sample exact colors from image
    const dnaMap = await extractAllDNA(boxes, imageBuffer, frame.w, frame.h)

    // Step 3 — inject DNA into constraint nodes
    const enrichedNodes = injectDNA(constraintNodes, dnaMap)

    // Step 4 — detect overall theme
    const theme = detectCanvasTheme(dnaMap)

    // Step 5 — build complete PalmIR
    return {
        version: '1.0-beta',
        source: 'geometry-engine+visual-dna', // tells LLM: trust the structure
        canvas: {
            width: frame.w,
            height: 'auto',
            theme
        },
        tokens: {
            ...styleTokens,
            // DNA-detected colors override style guide where detected
            detectedTheme: theme
        },
        components: enrichedNodes
    }
}

// ── Vision path compiler ───────────────────────────────────────
// Takes inspiration image + vision JSON
// Returns PalmIR enriched with DNA from the inspiration image

export async function compileVisionToPalmIR(
    visionJSON: any,
    inspirationBuffer: Buffer,
    styleTokens: any
) {
    // Vision path doesn't have Redux shapes
    // DNA is extracted from the inspiration image directly
    // based on the bounding boxes the vision model estimated

    const estimatedBoxes: BoundingBox[] = (visionJSON.components || [])
        .map((c: any, i: number) => {
            // Convert vision position descriptions to rough bounding boxes
            const positionToBounds = (pos: string, size: string, canvasW: number, canvasH: number) => {
                const w = size === 'full-width' ? canvasW
                    : size === 'large' ? canvasW * 0.6
                    : size === 'medium' ? canvasW * 0.4
                    : canvasW * 0.2

                const x = pos === 'left' ? 0
                    : pos === 'right' ? canvasW - w
                    : (canvasW - w) / 2

                const y = pos === 'top' ? 0
                    : pos === 'bottom' ? canvasH * 0.8
                    : canvasH * 0.3 + (i * 80)

                return { x, y, w, h: 60 }
            }

            const bounds = positionToBounds(
                c.position, c.size,
                visionJSON.canvas?.width || 1440,
                900
            )

            return {
                id: c.id || `vision-${i}`,
                ...bounds,
                centerX: bounds.x + bounds.w / 2,
                centerY: bounds.y + bounds.h / 2,
                right: bounds.x + bounds.w,
                bottom: bounds.y + bounds.h,
                semantic: c.type,
                content: c.children?.map((ch: any) => ch.content).join(' '),
            }
        })

    const dnaMap = await extractAllDNA(
        estimatedBoxes,
        inspirationBuffer,
        visionJSON.canvas?.width || 1440,
        900
    )

    const theme = detectCanvasTheme(dnaMap)

    return {
        version: '1.0-beta',
        source: 'vision+visual-dna',
        canvas: {
            width: visionJSON.canvas?.width || 1440,
            height: 'auto',
            theme
        },
        tokens: styleTokens,
        visionContext: {
            contentContext: visionJSON.contentContext,
            visualStyle: visionJSON.visualStyle,
            components: visionJSON.components
        },
        dnaByComponent: Object.fromEntries(dnaMap)
    }
}
