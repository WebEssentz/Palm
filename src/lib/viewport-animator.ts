import { AppDispatch } from '@/redux/store'
import { restoreViewport, Point } from '@/redux/slice/viewport'

interface AnimateViewportOptions {
    dispatch: AppDispatch
    startScale: number
    startTranslate: Point
    targetScale: number
    targetTranslate: Point
    duration?: number
    easing?: (t: number) => number
    onComplete?: () => void
}

let activeRaf: number | null = null
let activeCancelListeners: (() => void) | null = null

export function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
}

export function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function stopViewportAnimation() {
    if (activeRaf !== null) {
        cancelAnimationFrame(activeRaf)
        activeRaf = null
    }
    if (activeCancelListeners) {
        activeCancelListeners()
        activeCancelListeners = null
    }
}

export function animateViewport({
    dispatch,
    startScale,
    startTranslate,
    targetScale,
    targetTranslate,
    duration = 400,
    easing = easeInOutCubic,
    onComplete,
}: AnimateViewportOptions) {
    // Cancel any running animation
    stopViewportAnimation()

    // If already at target, complete immediately
    if (
        Math.abs(startScale - targetScale) < 0.0001 &&
        Math.abs(startTranslate.x - targetTranslate.x) < 0.5 &&
        Math.abs(startTranslate.y - targetTranslate.y) < 0.5
    ) {
        onComplete?.()
        return
    }

    const startTime = performance.now()

    // Cancel on user canvas drag/scroll, ignoring button clicks
    const onUserCancel = (e: Event) => {
        const target = e.target as HTMLElement | null
        if (target && target.closest('button, [role="button"], [role="menu"], [role="dialog"], input, select, textarea')) {
            return
        }
        stopViewportAnimation()
    }

    const graceTimer = setTimeout(() => {
        window.addEventListener('pointerdown', onUserCancel, { capture: true, passive: true })
        window.addEventListener('wheel', onUserCancel, { capture: true, passive: true })
    }, 80)

    activeCancelListeners = () => {
        clearTimeout(graceTimer)
        window.removeEventListener('pointerdown', onUserCancel, { capture: true })
        window.removeEventListener('wheel', onUserCancel, { capture: true })
    }

    function tick(now: number) {
        const elapsed = now - startTime
        const progress = Math.min(1, elapsed / duration)
        const ease = easing(progress)

        const currentScale = startScale + (targetScale - startScale) * ease
        const currentX = startTranslate.x + (targetTranslate.x - startTranslate.x) * ease
        const currentY = startTranslate.y + (targetTranslate.y - startTranslate.y) * ease

        dispatch(
            restoreViewport({
                scale: currentScale,
                translate: { x: currentX, y: currentY },
            })
        )

        if (progress < 1) {
            activeRaf = requestAnimationFrame(tick)
        } else {
            activeRaf = null
            if (activeCancelListeners) {
                activeCancelListeners()
                activeCancelListeners = null
            }
            onComplete?.()
        }
    }

    activeRaf = requestAnimationFrame(tick)
}
