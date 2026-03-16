'use client'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

type LightboxProps = {
    images: { url: string; id: string }[]
    index: number
    onClose: () => void
    onPrev: () => void
    onNext: () => void
    onSelect: (i: number) => void
}

export const Lightbox = ({ images, index, onClose, onPrev, onNext, onSelect }: LightboxProps) => {
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = '' }
    }, [])

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') onPrev()
            if (e.key === 'ArrowRight') onNext()
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onPrev, onNext, onClose])

    if (!images[index]) return null

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center" onClick={onClose}>
            <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={onClose}>
                <X className="w-6 h-6" />
            </button>

            <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
                {index + 1} / {images.length}
            </span>

            <button className="absolute left-4 text-white/70 hover:text-white z-10"
                onClick={(e) => { e.stopPropagation(); onPrev() }}>
                <ChevronLeft className="w-8 h-8" />
            </button>

            <img
                src={images[index].url}
                alt=""
                className="max-w-[80vw] max-h-[80vh] rounded-2xl object-contain"
                onClick={(e) => e.stopPropagation()}
            />

            <button className="absolute right-4 text-white/70 hover:text-white z-10"
                onClick={(e) => { e.stopPropagation(); onNext() }}>
                <ChevronRight className="w-8 h-8" />
            </button>

            <div className="absolute bottom-6 flex items-end gap-3 px-6">
                {images.map((image, i) => {
                    const seed = image.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
                    const random1 = ((seed * 9301 + 49297) % 233280) / 233280
                    const random3 = (((seed + 2) * 9301 + 49297) % 233280) / 233280
                    const rotation = (random1 - 0.5) * 12
                    const yOffset = (random3 - 0.5) * 8
                    return (
                        <div key={i}
                            onClick={(e) => { e.stopPropagation(); onSelect(i) }}
                            className={cn(
                                "w-14 h-10 rounded-lg overflow-hidden cursor-pointer transition-all duration-200",
                                i === index ? "ring-2 ring-white opacity-100" : "opacity-50 hover:opacity-80"
                            )}
                            style={{ transform: `rotate(${rotation}deg) translateY(${yOffset}px) ${i === index ? 'scale(1.25)' : ''}` }}
                        >
                            <img src={image.url} alt="" className="w-full h-full object-cover" />
                        </div>
                    )
                })}
            </div>
        </div>,
        document.body
    )
}
