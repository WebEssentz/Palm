"use client"
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles } from 'lucide-react'
import React from 'react'
import { useStyleGuide } from '@/hooks/use-styles'

type Props = {
    images: any[]
    fileInputRef: React.RefObject<HTMLInputElement | null>
    projectId: string
}

const GenerateStyleGuideButton = ({ images, fileInputRef, projectId }: Props) => {
    const { handleGenerateStyleGuide, isGenerating } = useStyleGuide(
        projectId,
        images, 
        fileInputRef
    )

  return (
    images.length > 0 && (
        <div className="flex justify-center">
            <Button 
                onClick={handleGenerateStyleGuide}
                className='rounded-full'
                disabled={isGenerating || images.some((img) => img.uploading)}
            >
                {isGenerating ? (
                <>
                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Analyzing Images...
                </>
                ) : (
                <>
                <Sparkles className='w-4 h-4 mr-2' />
                    Style with Palm
                </>
            )}
            </Button>
        </div>
    )
  )
}

export default GenerateStyleGuideButton