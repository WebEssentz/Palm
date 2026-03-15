export const MarqueeOverlay = ({
  startWorld,
  currentWorld,
}: {
  startWorld: { x: number; y: number }
  currentWorld: { x: number; y: number }
}) => {
  const x = Math.min(startWorld.x, currentWorld.x)
  const y = Math.min(startWorld.y, currentWorld.y)
  const w = Math.abs(currentWorld.x - startWorld.x)
  const h = Math.abs(currentWorld.y - startWorld.y)

  if (w < 2 || h < 2) return null

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        border: '1px solid #4f8ef7',
        backgroundColor: 'rgba(79, 142, 247, 0.08)',
        borderRadius: 2,
      }}
    />
  )
}
