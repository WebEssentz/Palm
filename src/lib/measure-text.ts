export const measureText = (shape: {
    text: string
    fontSize: number
    fontFamily: string
    fontWeight: number
    fontStyle: string
    letterSpacing: number
}): { width: number; height: number } => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return { width: 100, height: shape.fontSize * 1.2 }

    ctx.font = `${shape.fontStyle} ${shape.fontWeight} ${shape.fontSize}px ${shape.fontFamily}`
    
    // Letter spacing affects width
    let width = 0
    for (const char of shape.text) {
        width += ctx.measureText(char).width + shape.letterSpacing
    }

    return {
        width: Math.max(width, 20),
        height: shape.fontSize * 1.4
    }
}
