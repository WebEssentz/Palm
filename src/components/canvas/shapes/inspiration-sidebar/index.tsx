"use client"

import { cn } from '@/lib/utils'
import { ImageIcon, Loader2, Plus, Trash, Upload, X } from 'lucide-react'
import React from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useSearchParams } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import Image from 'next/image'
import { Lightbox } from '@/components/ui/lightbox'

type InspirationSidebarProps = {
    isOpen: boolean
    onClose: () => void
}

type Props = {
    index?: number
    id: string
    url?: string
    storageId?: string
    isFromServer?: boolean
    uploading: boolean
    uploaded: boolean
    file?: File
    error?: string
}

const InspirationSidebar = ({ isOpen, onClose }: InspirationSidebarProps) => {
    const [images, setImages] = React.useState<Props[]>([])
    const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null)
    const lightboxImages = React.useMemo(() => 
        images.filter(img => img.url).map(img => ({ url: img.url!, id: img.id })),
        [images]
    )
    const [dragActive, setDragActive] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const searchParams = useSearchParams()
    const projectId = searchParams.get('project')

    const generateUploadUrl = useMutation(api.inspiration.generateUploadUrl)
    const addInspirationImage = useMutation(api.inspiration.addInspirationImage)
    const removeInspirationImage = useMutation(api.inspiration.removeInspirationImage)

    const existingImages = useQuery(api.inspiration.getInspirationImages,
        projectId ? { projectId: projectId as Id<'projects'> } : "skip"
    )

    const handleDrag = React.useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave' || e.type === 'drop') {
            setDragActive(false)
        }
    }, [])

    const uploadImage = React.useCallback(
        async (file: File): Promise<{ storageId: string }> => {
            try {
                const uploadUrl = await generateUploadUrl()

                const result = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": file.type },
                    body: file,
                })

                if (!result.ok) {
                    throw new Error(`Upload failed: ${result.statusText}`)
                }

                const { storageId } = await result.json()

                if (projectId) {
                    await addInspirationImage({
                        projectId: projectId as Id<'projects'>,
                        storageId: storageId as Id<'_storage'>,
                    })
                }
                return { storageId }
            } catch (error) {
                console.error('Error uploading image:', error)
                throw error
            }
        },
        [generateUploadUrl, addInspirationImage, projectId]
    )

    const handleFileSelect = React.useCallback((files: FileList | null) => {
        if (!files || files.length === 0 ) return
        
        const newImages: Props[] = Array.from(files)
            .filter((file) => file.type.startsWith('image/'))
            .slice(0, 6 - images.length)
            .map((file) => ({
                id: `temp-${Date.now()}-${Math.random()}`,
                file,
                url: URL.createObjectURL(file),
                uploading: false,
                uploaded: false,
            }))
            if (newImages.length > 0) {
                setImages((prev) => [...prev, ...newImages])
                newImages.forEach(async (image) => {
                    setImages((prev) => 
                        prev.map((img) => 
                            img.id === image.id ? { ...img, uploading: true } : img
                        )
                    )
                    try {
                        const { storageId } = await uploadImage(image.file!)

                        setImages((prev) => 
                            prev.map((img) => 
                                img.id === image.id ? { ...img, uploading: false, uploaded: true, storageId, isFromServer: true } : img
                            )
                        )
                    } catch (error) {
                        console.error('Error uploading image:', error)
                        setImages((prev) => 
                            prev.map((img) => 
                                img.id === image.id ? { ...img, uploading: false, error: 'Upload failed' } : img
                            )
                        )
                    }
                })
            }
    }, [images.length, uploadImage])

    const handleDrop = React.useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files)
        }  
    }, [handleFileSelect])

    React.useEffect(() => {
        if (existingImages && existingImages.length > 0) {
            const serverImages: Props[] = existingImages.map((image) => ({
                id: image.id,
                url: image.url || undefined,
                storageId: image.storageId,
                isFromServer: true,
                uploading: false,
                index: image.index,
                uploaded: true,
            }))
            setImages((prev) => {
                const localImages = prev.filter((img) => !img.isFromServer)
                return [...serverImages, ...localImages]
            })
        } else if (existingImages && existingImages.length === 0) {
            setImages((prev) => prev.filter((img) => !img.isFromServer))
        }
    }, [existingImages])


    const clearAllImages = async () => {
        const imagesToRemove = images.filter(
            (img) => img.storageId && img.isFromServer
        )

        for (const image of imagesToRemove) { 
            if (projectId && image.storageId) {
                try {
                    await removeInspirationImage({
                        projectId: projectId as Id<'projects'>,
                        storageId: image.storageId as Id<'_storage'>,
                    })
                } catch (error) {
                    console.error('Error removing image:', error)
                }
            }
        }
    }

    const removeImage = async (imageId: string) => {
        const image = images.find((img) => img.id === imageId)
        if (!image) return

        if (image.storageId && image.isFromServer && projectId) {
            try {
                await removeInspirationImage({
                    projectId: projectId as Id<'projects'>,
                    storageId: image.storageId as Id<'_storage'>,
                })
            } catch (error) {
                console.error('Error removing image:', error)
            }
        }

        setImages((prev) => prev.filter((img) => img.id !== imageId))
    }

    return (
        <div className={cn(
            'fixed left-5 top-1/2 transform -translate-y-1/2',
            'w-60 xl:w-72',
            'backdrop-blur-xl bg-foreground/[0.06]',
            'border-foreground/[0.12] gap-2 p-2 xl:p-3 saturate-150 border rounded-lg z-50 transition-transform duration-300',
            'max-h-[calc(100vh-5rem)] overflow-y-auto'
        )}>
            {/* Header */}
            <div className='px-2 py-1.5 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                    <ImageIcon className='w-4 h-4 text-foreground/80' />
                    <Label className="text-foreground/80 font-medium text-sm">Inspiration Board</Label>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className='h-7 w-7 p-0 text-foreground/60 hover:text-foreground hover:bg-foreground/10'
                >
                    <X className='w-4 h-4' />
                </Button>
            </div>

            {/* Drop zone — compact on small screens */}
            <div
                className={cn(
                    'border-2 border-dashed rounded-lg text-center transition-all duration-200 cursor-pointer',
                    'p-3 xl:p-6',
                    dragActive
                        ? 'border-blue-400 bg-blue-500/10'
                        : images.length < 6
                            ? 'border-foreground/20 hover:border-foreground/40 hover:bg-foreground/5'
                            : 'border-foreground/10 bg-foreground/5 cursor-not-allowed opacity-50'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => images.length < 6 && fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                />
                <div className='flex flex-col items-center gap-1.5'>
                    <Upload className='w-6 h-6 xl:w-8 xl:h-8 text-foreground/40' />
                    <p className='text-xs text-foreground/60'>
                        {images.length < 6 ? (
                            <>
                                Drop images or{' '}
                                <span className='text-blue-400'>browse</span>
                                <br />
                                <span className='text-[11px] text-foreground/40'>
                                    {images.length}/6 uploaded
                                </span>
                            </>
                        ) : (
                            'Maximum 6 images reached'
                        )}
                    </p>
                </div>
            </div>

            {/* Image grid */}
            {images.length > 0 && (
                <div className='space-y-2'>
                    <div className="flex items-center justify-between">
                        <Label className='text-foreground/70 text-xs'>
                            Images ({images.length})
                        </Label>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllImages}
                            className='h-6 px-2 text-xs text-foreground/60 hover:text-foreground hover:bg-foreground/10'
                        >
                            <Trash className='w-3 h-3 mr-1' />
                            Clear All
                        </Button>
                    </div>

                    <div className='grid grid-cols-3 gap-1.5'>
                        {images.map((image) => (
                            <div
                                key={image.id}
                                className='relative group aspect-square rounded-md overflow-hidden border border-foreground/10 bg-foreground/5 cursor-pointer'
                                onClick={() => {
                                    const i = lightboxImages.findIndex(img => img.id === image.id)
                                    if (i !== -1) setLightboxIndex(i)
                                }}
                            >
                                <Image
                                    src={image.url || ""}
                                    alt="Inspiration"
                                    width={100}
                                    height={100}
                                    className='w-full h-full object-cover'
                                />
                                {image.uploading && (
                                    <div className='absolute inset-0 bg-black/50 flex items-center justify-center'>
                                        <Loader2 className='w-4 h-4 text-white animate-spin'/>
                                    </div>
                                )}
                                {image.error && (
                                    <div className='absolute inset-0 bg-red-500/20 flex items-center justify-center'>
                                        <p className='text-[10px] text-red-300 text-center px-1'>
                                            {image.error}
                                        </p>
                                    </div>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        removeImage(image.id)
                                    }}
                                    className='absolute top-0.5 right-0.5 h-5 w-5 p-0 bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity'
                                >
                                    <X className='w-2.5 h-2.5 text-white' />
                                </Button>
                                {image.uploaded && !image.uploading && (
                                    <div className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white/20" />
                                )}
                            </div>
                        ))}

                        {images.length < 6 && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className='aspect-square rounded-md border-2 border-dashed border-foreground/20 bg-foreground/5 hover:border-foreground/40 hover:bg-foreground/10 transition-all duration-200 flex items-center justify-center group'
                            >
                                <Plus className='w-4 h-4 text-foreground/40 group-hover:text-foreground/60'/>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {lightboxIndex !== null && lightboxImages[lightboxIndex] && (
                <Lightbox
                    images={lightboxImages}
                    index={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onPrev={() => setLightboxIndex(i => i === 0 ? lightboxImages.length - 1 : i! - 1)}
                    onNext={() => setLightboxIndex(i => i === lightboxImages.length - 1 ? 0 : i! + 1)}
                    onSelect={setLightboxIndex}
                />
            )}
        </div>
    )
}

export default InspirationSidebar