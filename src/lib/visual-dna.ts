import sharp from 'sharp'
import { BoundingBox } from './geometry-engine'

export interface VisualDNA {
    bg: string
    textColor: string
    borderColor: string | null
    borderWidth: string
    radius: string
    hasShadow: boolean
    shadowStyle: string | null
    gradient: GradientDNA | null
    opacity: number
    theme: 'dark' | 'light'
    isGlassmorphism: boolean
}

export interface GradientDNA {
    type: 'linear' | 'radial'
    direction: string
    stops: { color: string; position: number }[]
}

// Sample average color of a region
async function sampleRegionColor(
    imageBuffer: Buffer,
    x: number, y: number, w: number, h: number
): Promise<{ r: number; g: number; b: number }> {
    try {
        const region = await sharp(imageBuffer)
            .extract({
                left: Math.max(0, Math.round(x)),
                top: Math.max(0, Math.round(y)),
                width: Math.max(1, Math.round(w)),
                height: Math.max(1, Math.round(h))
            })
            .resize(1, 1)
            .raw()
            .toBuffer()
        return { r: region[0], g: region[1], b: region[2] }
    } catch {
        return { r: 255, g: 255, b: 255 }
    }
}

function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b]
        .map(v => Math.round(v).toString(16).padStart(2, '0'))
        .join('')
}

function colorDistance(
    a: { r: number; g: number; b: number },
    b: { r: number; g: number; b: number }
): number {
    return Math.sqrt(
        Math.pow(a.r - b.r, 2) +
        Math.pow(a.g - b.g, 2) +
        Math.pow(a.b - b.b, 2)
    )
}

function isDark(r: number, g: number, b: number): boolean {
    return (0.299 * r + 0.587 * g + 0.114 * b) < 128
}

// ── Gradient Detection ─────────────────────────────────────────
// Sample 5 points diagonally across the box
// If colors change significantly → it's a gradient
async function detectGradient(
    imageBuffer: Buffer,
    ix: number, iy: number, iw: number, ih: number
): Promise<GradientDNA | null> {
    const sampleSize = Math.min(4, iw * 0.05, ih * 0.05)

    const samples = await Promise.all([
        sampleRegionColor(imageBuffer, ix, iy, sampleSize, sampleSize),                          // top-left
        sampleRegionColor(imageBuffer, ix + iw * 0.25, iy + ih * 0.25, sampleSize, sampleSize),  // quarter
        sampleRegionColor(imageBuffer, ix + iw * 0.5, iy + ih * 0.5, sampleSize, sampleSize),    // center
        sampleRegionColor(imageBuffer, ix + iw * 0.75, iy + ih * 0.75, sampleSize, sampleSize),  // three-quarter
        sampleRegionColor(imageBuffer, ix + iw - sampleSize, iy + ih - sampleSize, sampleSize, sampleSize), // bottom-right
    ])

    // Minimum brightness check — don't detect gradients on very dark backgrounds
    const avgBrightness = (samples[2].r + samples[2].g + samples[2].b) / 3
    if (avgBrightness < 60) return null // dark backgrounds → never gradient

    // Check if colors shift significantly across samples
    const totalShift = colorDistance(samples[0], samples[4])
    if (totalShift < 45) return null // only fire on obvious gradients

    // Detect direction by comparing horizontal vs vertical shift
    const [topLeft, topRight, bottomLeft] = await Promise.all([
        sampleRegionColor(imageBuffer, ix, iy, sampleSize, sampleSize),
        sampleRegionColor(imageBuffer, ix + iw - sampleSize, iy, sampleSize, sampleSize),
        sampleRegionColor(imageBuffer, ix, iy + ih - sampleSize, sampleSize, sampleSize),
    ])

    const hShift = colorDistance(topLeft, topRight)
    const vShift = colorDistance(topLeft, bottomLeft)
    const dShift = totalShift

    let direction = 'to bottom right'
    if (hShift > vShift && hShift > dShift * 0.7) direction = 'to right'
    else if (vShift > hShift && vShift > dShift * 0.7) direction = 'to bottom'
    else if (dShift > hShift && dShift > vShift) direction = 'to bottom right'

    return {
        type: 'linear',
        direction,
        stops: [
            { color: rgbToHex(samples[0].r, samples[0].g, samples[0].b), position: 0 },
            { color: rgbToHex(samples[2].r, samples[2].g, samples[2].b), position: 50 },
            { color: rgbToHex(samples[4].r, samples[4].g, samples[4].b), position: 100 },
        ]
    }
}

// ── Shadow Detection ───────────────────────────────────────────
// Sample pixels just OUTSIDE the box boundary
// If they're darker than the background → shadow present
async function detectShadow(
    imageBuffer: Buffer,
    ix: number, iy: number, iw: number, ih: number,
    imgW: number, imgH: number
): Promise<{ hasShadow: boolean; style: string | null }> {
    const offset = 8
    const sampleSize = 4

    // Sample below and to the right of the box
    const below = await sampleRegionColor(
        imageBuffer,
        Math.min(ix + iw * 0.5, imgW - sampleSize),
        Math.min(iy + ih + offset, imgH - sampleSize),
        sampleSize, sampleSize
    )
    const inside = await sampleRegionColor(
        imageBuffer,
        ix + iw * 0.5,
        iy + ih * 0.5,
        sampleSize, sampleSize
    )

    const shadowDarkness = colorDistance(below, inside)

    if (shadowDarkness < 15) return { hasShadow: false, style: null }

    // Classify shadow size by darkness
    if (shadowDarkness > 60) return { hasShadow: true, style: 'shadow-2xl' }
    if (shadowDarkness > 35) return { hasShadow: true, style: 'shadow-xl' }
    return { hasShadow: true, style: 'shadow-md' }
}

// ── Stroke Weight Detection ────────────────────────────────────
// Sample edge pixels at 1px, 2px, 3px intervals
// Width where color stops changing = border width
async function detectStrokeWeight(
    imageBuffer: Buffer,
    ix: number, iy: number, iw: number
): Promise<string> {
    const edgeY = iy
    const centerColor = await sampleRegionColor(imageBuffer, ix + iw * 0.5, iy + 10, 2, 2)

    const px1 = await sampleRegionColor(imageBuffer, ix + iw * 0.5, edgeY, 1, 1)
    const px2 = await sampleRegionColor(imageBuffer, ix + iw * 0.5, edgeY + 1, 1, 1)
    const px3 = await sampleRegionColor(imageBuffer, ix + iw * 0.5, edgeY + 2, 1, 1)

    const d1 = colorDistance(px1, centerColor)
    const d2 = colorDistance(px2, centerColor)
    const d3 = colorDistance(px3, centerColor)

    if (d1 > 20 && d2 > 20 && d3 > 20) return '2px'
    if (d1 > 20 && d2 > 20) return '1.5px'
    if (d1 > 20) return '1px'
    return '0px'
}

// ── Glassmorphism Detection ────────────────────────────────────
// If box is semi-transparent: colors behind bleed through
// Detect by checking if box color is muted version of surroundings
async function detectGlassmorphism(
    imageBuffer: Buffer,
    ix: number, iy: number, iw: number, ih: number
): Promise<boolean> {
    if (ix < 10 || iy < 10) return false

    const inside = await sampleRegionColor(
        imageBuffer, ix + iw * 0.3, iy + ih * 0.3, 8, 8
    )
    const outside = await sampleRegionColor(
        imageBuffer, Math.max(0, ix - 20), iy + ih * 0.3, 8, 8
    )

    // If inside color is a muted/lighter version of outside → glassmorphism
    const shift = colorDistance(inside, outside)
    const insideBrightness = (inside.r + inside.g + inside.b) / 3
    const outsideBrightness = (outside.r + outside.g + outside.b) / 3

    return shift < 60 && Math.abs(insideBrightness - outsideBrightness) < 40 && shift > 10
}

function detectRadius(corners: { r: number; g: number; b: number }[], bg: { r: number; g: number; b: number }): string {
    // If corners match background → they're transparent → rounded corners
    const cornerMatchesBg = corners.every(c =>
        Math.abs(c.r - bg.r) < 20 &&
        Math.abs(c.g - bg.g) < 20 &&
        Math.abs(c.b - bg.b) < 20
    )
    if (cornerMatchesBg) return '12px'
    return '4px'
}

export async function extractVisualDNA(
    box: BoundingBox,
    imageBuffer: Buffer,
    canvasW: number,
    canvasH: number
): Promise<VisualDNA> {
    const { width: imgW = canvasW, height: imgH = canvasH } =
        await sharp(imageBuffer).metadata()

    const scaleX = imgW / canvasW
    const scaleY = imgH / canvasH

    const ix = box.x * scaleX
    const iy = box.y * scaleY
    const iw = Math.max(4, box.w * scaleX)
    const ih = Math.max(4, box.h * scaleY)

    const [
        centerColor,
        gradient,
        shadowResult,
        strokeWeight,
        isGlass,
    ] = await Promise.all([
        sampleRegionColor(imageBuffer, ix + iw * 0.25, iy + ih * 0.25, iw * 0.5, ih * 0.5),
        detectGradient(imageBuffer, ix, iy, iw, ih),
        detectShadow(imageBuffer, ix, iy, iw, ih, imgW, imgH),
        detectStrokeWeight(imageBuffer, ix, iy, iw),
        detectGlassmorphism(imageBuffer, ix, iy, iw, ih),
    ])

    // Corner radius detection
    const cornerSize = Math.min(8, iw * 0.1, ih * 0.1)
    const corners = await Promise.all([
        sampleRegionColor(imageBuffer, ix, iy, cornerSize, cornerSize),
        sampleRegionColor(imageBuffer, ix + iw - cornerSize, iy, cornerSize, cornerSize),
        sampleRegionColor(imageBuffer, ix, iy + ih - cornerSize, cornerSize, cornerSize),
        sampleRegionColor(imageBuffer, ix + iw - cornerSize, iy + ih - cornerSize, cornerSize, cornerSize),
    ])

    const cornerMatchesBg = corners.every(c =>
        Math.abs(c.r - centerColor.r) < 25 &&
        Math.abs(c.g - centerColor.g) < 25 &&
        Math.abs(c.b - centerColor.b) < 25
    )

    // Border detection
    const topEdge = await sampleRegionColor(imageBuffer, ix + iw * 0.4, iy, iw * 0.2, 2)
    const hasBorder = colorDistance(topEdge, centerColor) > 15

    const dark = isDark(centerColor.r, centerColor.g, centerColor.b)

    return {
        bg: gradient ? 'gradient' : rgbToHex(centerColor.r, centerColor.g, centerColor.b),
        textColor: dark ? '#ffffff' : '#0a0a0a',
        borderColor: hasBorder ? rgbToHex(topEdge.r, topEdge.g, topEdge.b) : null,
        borderWidth: strokeWeight,
        radius: cornerMatchesBg ? '12px' : '4px',
        hasShadow: shadowResult.hasShadow,
        shadowStyle: shadowResult.style,
        gradient,
        opacity: 1,
        theme: dark ? 'dark' : 'light',
        isGlassmorphism: isGlass,
    }
}

// Extract DNA for all boxes in parallel
export async function extractAllDNA(
    boxes: BoundingBox[],
    imageBuffer: Buffer,
    canvasW: number,
    canvasH: number
): Promise<Map<string, VisualDNA>> {
    const results = await Promise.all(
        boxes.map(async box => ({
            id: box.id,
            dna: await extractVisualDNA(box, imageBuffer, canvasW, canvasH)
        }))
    )
    return new Map(results.map(r => [r.id, r.dna]))
}
