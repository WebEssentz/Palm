import { VisualDNA } from './visual-dna'

// Converts VisualDNA to CSS string
export function dnaToCSS(dna: VisualDNA): string {
    const parts: string[] = []

    // Gradient background rule
    if (dna.gradient && dna.gradient.type === 'radial') {
        const stops = dna.gradient.stops
            .map(s => `${s.color} ${s.position}%`)
            .join(', ')
        parts.push(`background: radial-gradient(ellipse at 50% 30%, ${stops})`)
    } else if (dna.gradient && dna.gradient.type === 'linear') {
        const stops = dna.gradient.stops
            .map(s => `${s.color} ${s.position}%`)
            .join(', ')
        parts.push(`background: linear-gradient(${dna.gradient.direction}, ${stops})`)
    } else {
        parts.push(`background: ${dna.bg}`)
    }

    if (dna.borderColor && dna.borderWidth !== '0px') {
        parts.push(`border: ${dna.borderWidth} solid ${dna.borderColor}`)
    }

    if (dna.radius !== '0px') {
        parts.push(`border-radius: ${dna.radius}`)
    }

    if (dna.shadowStyle) {
        const shadowMap: Record<string, string> = {
            'shadow-md': '0 4px 6px rgba(0,0,0,0.1)',
            'shadow-xl': '0 20px 25px rgba(0,0,0,0.15)',
            'shadow-2xl': '0 25px 50px rgba(0,0,0,0.25)',
        }
        parts.push(`box-shadow: ${shadowMap[dna.shadowStyle] || ''}`)
    }

    if (dna.isGlassmorphism) {
        parts.push('backdrop-filter: blur(12px)')
        parts.push('background: rgba(255,255,255,0.1)')
    }

    return parts.join('; ')
}
