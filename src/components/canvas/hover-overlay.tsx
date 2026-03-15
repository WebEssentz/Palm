import { Shape } from '@/redux/slice/shapes'
import { measureText } from '@/lib/measure-text'

export const HoverOverlay = ({ shape }: { shape: Shape }) => {
  const getBounds = () => {
    switch (shape.type) {
      case 'frame':
      case 'rect':
      case 'ellipse':
      case 'generatedui':
        return { x: shape.x, y: shape.y, w: shape.w, h: shape.h }
      case 'freedraw':
        if (shape.points.length === 0) return null
        const xs = shape.points.map(p => p.x)
        const ys = shape.points.map(p => p.y)
        return {
          x: Math.min(...xs) - 5,
          y: Math.min(...ys) - 5,
          w: Math.max(...xs) - Math.min(...xs) + 10,
          h: Math.max(...ys) - Math.min(...ys) + 10,
        }
      case 'arrow':
      case 'line':
        return {
          x: Math.min(shape.startX, shape.endX) - 5,
          y: Math.min(shape.startY, shape.endY) - 5,
          w: Math.abs(shape.endX - shape.startX) + 10,
          h: Math.abs(shape.endY - shape.startY) + 10,
        }
      case 'text':
        const { width, height } = measureText(shape)
        const paddingX = 8
        const paddingY = 4
        return {
          x: shape.x - 2,
          y: shape.y - 2,
          w: width + paddingX + 4,
          h: height + paddingY + 4,
        }
      case 'group':
        return { x: shape.x, y: shape.y, w: shape.w, h: shape.h }
      default:
        return null
    }
  }

  const bounds = getBounds()
  if (!bounds) return null

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: bounds.x - 2,
        top: bounds.y - 2,
        width: bounds.w + 4,
        height: bounds.h + 4,
        border: '1.5px solid rgba(59, 130, 246, 0.7)',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        borderRadius: shape.type === 'frame' ? '10px' : '4px',
      }}
    />
  )
}
