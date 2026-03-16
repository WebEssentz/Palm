"use client"

import { MoodBoardImage, useMoodBoard } from "@/hooks/use-styles"
import { cn } from "@/lib/utils"
import { Upload, X } from "lucide-react"
import ImagesBoard from "./images.board"
import { Button } from "@/components/ui/button"
import React, { useState } from "react"
import { useSearchParams } from "next/navigation"
import GenerateStyleGuideButton from "@/components/buttons/style-guide"
import { Lightbox } from '@/components/ui/lightbox'

type Props = {
  guideImages: MoodBoardImage[]
}

const MoodBoard = ({ guideImages }: Props) => {
  const {
    images,
    dragActive,
    removeImage,
    handleDrag,
    handleDrop,
    handleFileInput,
    canAddMore,
    maxImages,
  } = useMoodBoard(guideImages)

  const params = useSearchParams()
  const projectId = params.get('project')
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const handleUploadClick = () => fileInputRef.current?.click()

  // ← ADD THESE
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const lightboxImages = images.filter(img => img.url).map(img => ({ url: img.url!, id: img.id }))

  const openLightbox = (imageId: string) => {
    const index = lightboxImages.findIndex(img => img.id === imageId)
    if (index !== -1) setLightboxIndex(index)
  }
  const closeLightbox = () => setLightboxIndex(null)
  const prev = () => setLightboxIndex(i => i === 0 ? lightboxImages.length - 1 : i! - 1)
  const next = () => setLightboxIndex(i => i === lightboxImages.length - 1 ? 0 : i! + 1)

  return (
    <div className="flex flex-col gap-10">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-200 min-h-[400px] flex items-center justify-center",
          dragActive
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border/50 hover:border-border"
        )}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-transparent rounded-3xl" />
        </div>

        {/* ← YOUR EXACT SEED MATH — UNTOUCHED, just added onClick */}
        {images.length > 0 && (
          <>
            <div className="lg:hidden absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {images.map((image, index) => {
                  const seed = image.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
                  const random1 = ((seed * 9301 + 49297) % 233280) / 233280
                  const random2 = (((seed + 1) * 9301 + 49297) % 233280) / 233280
                  const random3 = (((seed + 2) * 9301 + 49297) % 233280) / 233280
                  const rotation = (random1 - 0.5) * 20
                  const xOffset = (random2 - 0.5) * 40
                  const yOffset = (random3 - 0.5) * 30
                  return (
                    <div key={`mobile-${image.id}`} onClick={() => openLightbox(image.id)} className="cursor-zoom-in">
                      <ImagesBoard
                        image={image}
                        removeImage={removeImage}
                        xOffset={xOffset}
                        yOffset={yOffset}
                        rotation={rotation}
                        zIndex={index + 1}
                        marginLeft="-80px"
                        marginTop="-96px"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="hidden lg:flex absolute inset-0 items-center justify-center">
              <div className="relative w-full max-w-[700px] h-[300px] mx-auto">
                {images.map((image, index) => {
                  const seed = image.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
                  const random1 = ((seed * 9301 + 49297) % 233280) / 233280
                  const random3 = (((seed + 2) * 9301 + 49297) % 233280) / 233280
                  const imageWidth = 192
                  const overlapAmount = 30
                  const spacing = imageWidth - overlapAmount
                  const rotation = (random1 - 0.5) * 50
                  const xOffset = index * spacing - ((images.length - 1) * spacing) / 2
                  const yOffset = (random3 - 0.5) * 30
                  return (
                    <div key={`desktop-${image.id}`} onClick={() => openLightbox(image.id)} className="cursor-zoom-in">
                      <ImagesBoard
                        image={image}
                        removeImage={removeImage}
                        xOffset={xOffset}
                        yOffset={yOffset}
                        rotation={rotation}
                        zIndex={index + 1}
                        marginLeft="-80px"
                        marginTop="-96px"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {images.length === 0 && (
          <div className="relative z-10 space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Upload className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-foreground">Curate your mood</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Drag & drop up to {maxImages} images to get started
              </p>
            </div>
            <Button onClick={handleUploadClick} variant="outline" className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Add from Device
            </Button>
          </div>
        )}

        {images.length > 0 && canAddMore && (
          <div className="absolute bottom-6 right-6 z-20">
            <Button onClick={handleUploadClick} size="sm" variant="outline" className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Add More
            </Button>
          </div>
        )}

        <input type="file" ref={fileInputRef} onChange={handleFileInput} multiple accept="image/*" className="hidden" />
      </div>

      <GenerateStyleGuideButton images={images} fileInputRef={fileInputRef} projectId={projectId ?? ''} />

      {images.length >= 5 && (
        <div className="text-center p-4 bg-muted/50 rounded-2xl">
          <p className="text-sm text-muted-foreground">Maximum of {maxImages} images allowed</p>
        </div>
      )}

      {lightboxIndex !== null && lightboxImages[lightboxIndex] && (
        <Lightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prev}
          onNext={next}
          onSelect={setLightboxIndex}
        />
      )}
    </div>
  )
}

export default MoodBoard