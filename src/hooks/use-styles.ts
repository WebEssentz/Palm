"use client"

import { toast } from "sonner"
import { Id } from "../../convex/_generated/dataModel"
import { useRouter, useSearchParams } from "next/navigation"
import React, { RefObject } from "react"
import { useForm } from "react-hook-form"
import { useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useGenerateStyleGuideMutation } from "@/redux/api/style-guide"
import { GeneratedUIShape, updateShape } from "@/redux/slice/shapes"
import { useAppDispatch } from "@/redux/store"

export interface MoodBoardImage {
    id: string
    file?: File
    preview: string
    storageId?: string
    uploaded: boolean
    uploading: boolean
    error?: string
    url?: string
    isFromServer?: boolean
}

interface StylesFormData {
    images: MoodBoardImage[]
}

const MAX_IMAGES = 5

export const useMoodBoard = (guideImages: MoodBoardImage[]) => {
    const [dragActive, setDragActive] = React.useState(false)
    const searchParams = useSearchParams()
    const projectId = searchParams.get("project")

    const form = useForm<StylesFormData>({
        defaultValues: {
            images: [],
        },
    })

    const { watch, setValue, getValues } = form
    const images = watch("images")

    const generateUploadUrl = useMutation(api.moodboard.generateUploadUrl)
    const removeMoodBoardImage = useMutation(api.moodboard.removeMoodBoardImage)
    const addMoodBoardImage = useMutation(api.moodboard.addMoodBoardImage)

    const uploadImage = async (
        file: File
    ): Promise<{ storageId: string; url?: string }> => {
        try {
            const uploadUrl = await generateUploadUrl()

            const result = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': file.type },
                body: file,
            })

            if (!result.ok) {
                throw new Error(`Upload failed: ${result.statusText}`)
            }

            const { storageId } = await result.json()

            if (projectId) {
                await addMoodBoardImage({
                    projectId: projectId as Id<'projects'>,
                    storageId: storageId as Id<'_storage'>,
                })
            }

            return { storageId }
        } catch (error) {
            console.error(error)
            throw error
        }
    }

    React.useEffect(() => {
        if (guideImages && guideImages.length > 0) {
            const serverImages: MoodBoardImage[] = guideImages.map((img: any) => ({
                id: img.id,
                preview: img.url,
                storageId: img.storageId,
                uploaded: true,
                uploading: false,
                url: img.url,
                isFromServer: true,
            }))

            const currentImages = getValues("images")

            if (currentImages.length === 0) {
                setValue("images", serverImages)
            } else {
                const mergedImages = [...currentImages]
                serverImages.forEach((serverImg) => {
                    const clientIndex = mergedImages.findIndex((clientImg) => clientImg.storageId === serverImg.storageId)

                    if (clientIndex !== -1) {
                        if (mergedImages[clientIndex].preview.startsWith("blob:")) {
                            URL.revokeObjectURL(mergedImages[clientIndex].preview)
                        }

                        mergedImages[clientIndex] = serverImg
                    }
                })
                setValue("images", mergedImages)
            }
        }
    }, [guideImages, setValue, getValues])

    const addImage = (file: File) => {
        if (images.length >= MAX_IMAGES) {
            toast.error(`You can only upload up to ${MAX_IMAGES} images.`)
            return
        }

        const newImage: MoodBoardImage = {
            id: `${Date.now()}-${Math.random()}`,
            file,
            preview: URL.createObjectURL(file),
            uploaded: false,
            uploading: false,
            isFromServer: false,
        }

        const updatedImages = [...images, newImage]
        setValue("images", updatedImages)

        toast.success('Image added to mood board.')
    }

    const removeImage = async (imageId: string) => {
        const imageToRemove = images.find((img) => img.id === imageId)
        if (!imageToRemove) return

        if (imageToRemove.isFromServer && imageToRemove.storageId && projectId) {
            try {
                await removeMoodBoardImage({
                    projectId: projectId as Id<'projects'>,
                    storageId: imageToRemove.storageId as Id<'_storage'>,
                })
            } catch (error) {
                console.error(error)
                toast.error('Failed to remove image from the server')
                return
            }
        }

        const updatedImages = images.filter((img) => {
            if (img.id === imageId) {
                if (!img.isFromServer && img.preview.startsWith('blob:')) {
                    URL.revokeObjectURL(img.preview)
                }
                return false
            }
            return true
        })


        setValue("images", updatedImages)
        toast.success('Image removed')
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        const files = Array.from(e.dataTransfer.files)
        const imageFiles = files.filter((file) => file.type.startsWith('image/'))

        if (imageFiles.length === 0) {
            toast.error('Please drop image files only')
            return
        }

        imageFiles.forEach((file) => {
            if (images.length < MAX_IMAGES) {
                addImage(file)
            }
        })
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        files.forEach((file) => addImage(file))

        // Reset input
        e.target.value = ''
    }

    React.useEffect(() => {
        const uploadPendingImages = async () => {
            const currentImages = getValues('images')
            for (let i = 0; i < currentImages.length; i++) {
                const image = currentImages[i]
                if (!image.uploaded && !image.uploading && !image.error) {
                    const updatedImages = [...currentImages]
                    updatedImages[i] = { ...image, uploading: true }
                    setValue('images', updatedImages)
                    try {
                        const { storageId } = await uploadImage(image.file!)
                        const finalImages = getValues('images')
                        const finalIndex = finalImages.findIndex(
                            (img) => img.id === image.id
                        )
                        if (finalIndex !== -1) {
                            finalImages[finalIndex] = {
                                ...finalImages[finalIndex],
                                storageId,
                                uploaded: true,
                                uploading: false,
                                isFromServer: true,
                            }
                            setValue('images', [...finalImages])
                        }
                    } catch (error) {
                        console.error('Error uploading image:', error)
                        const erroredImages = getValues('images')
                        const errorIndex = erroredImages.findIndex(
                            (img) => img.id === image.id
                        )
                        if (errorIndex !== -1) {
                            erroredImages[errorIndex] = {
                                ...erroredImages[errorIndex],
                                uploading: false,
                                error: 'Failed to upload',
                            }
                            setValue('images', [...erroredImages])
                        }
                    }
                }
            }
        }

        if (images.length > 0) {
            uploadPendingImages()
        }
    }, [images, getValues, setValue])

    React.useEffect(() => {
        return () => {
            images.forEach((image) => {
                URL.revokeObjectURL(image.preview)
            })
        }
    }, [])

    return {
        form,
        images,
        dragActive,
        handleDrag,
        handleDrop,
        handleFileInput,
        removeImage,
        addImage,
        canAddMore: images.length < MAX_IMAGES,
        maxImages: MAX_IMAGES,
    }
}

export const useStyleGuide =  (
    projectId: string,
    images: MoodBoardImage[],
    fileInputRef: RefObject<HTMLInputElement | null>
) => {
    const [generateStyleGuide, { isLoading: isGenerating }] =
        useGenerateStyleGuideMutation()

    const router = useRouter()
    const handleUploadClick = () => fileInputRef.current?.click()

    const handleGenerateStyleGuide = async () => {
        if (!projectId) { 
            toast.error('Project ID is required')
            return
        }

        if (images.length === 0) {
            toast.error('Please add at least one image')
            return
        }

        if (images.some((img) => !img.uploaded || !img.storageId)) {
            toast.error('Please upload all images before generating style guide')
            return
        }

        try {
          toast.loading('Generating style guide...', {
            id: 'style-guide-generation',
          })

          const result = await generateStyleGuide({ projectId }).unwrap()

          if (!result.success) {
            toast.error(result.message || 'Failed to generate style guide', {
                id: 'style-guide-generation',
            })
            return
          }

          router.refresh()
          toast.success('Style guide generated successfully', {
            id: 'style-guide-generation',
          })
          setTimeout(() => {
            toast.success(
                'Style guide generated successfully, Switch to Colors tab to see the results',
                { duration: 5000 }
            )
          }, 1000)
          
        } catch (error) {
            const errorMessage = 
                error && typeof error === 'object' && 'error' in error
                ? (error as { error: string }).error
                : 'Failed to generate style guide'

            toast.error(errorMessage, { id: 'style-guide-generation' })
        }
    }

    return {
        handleGenerateStyleGuide,
        isGenerating,
        handleUploadClick,
    }
}

export const useUpdateContainer = (
    shape: GeneratedUIShape
) => {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const dispatch = useAppDispatch()

    React.useEffect(() => {
        if (containerRef.current && shape.uiSpecData) {
            const timeoutId = setTimeout(() => {
                const actualHeight = containerRef?.current?.offsetHeight || 0
                if (actualHeight > 0 && Math.abs(actualHeight - shape.h) > 10) {
                    dispatch(
                        updateShape({
                            id: shape.id,
                            patch: {
                                h: actualHeight,
                            },
                        })
                    )
                }
            }, 100)

            return () => clearTimeout(timeoutId)
        }
    }, [shape.uiSpecData, shape.h, shape.id, dispatch])

    const sanitizeHtml = (html: string) => {
        // Strip markdown code fences the model likes to add
        const stripped = html
            .replace(/^```[\w]*\n?/gm, '')
            .replace(/```$/gm, '')
            .trim()

        const sanitized = stripped
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<style[^>]*>.*?<\/style>/gi, '')
            .replace(/on\w+=["'][^"']+["']/gi, '')
            .replace(/href=["']javascript:[^"']+["']/gi, '')
            .replace(/src=["']javascript:[^"']+["']/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>))<\/iframe>/gi, '')
            .replace(/<object\b[^<]*(?:(?!<\/object>))<\/object>/gi, '')
            .replace(/<embed\b[^<]*(?:(?!<\/embed>))<\/embed>/gi, '')
            .replace(/<applet\b[^<]*(?:(?!<\/applet>))<\/applet>/gi, '')
            .replace(/<form\b[^<]*(?:(?!<\/form>))<\/form>/gi, '')
            .replace(/<input\b[^<]*(?:(?!<\/input>))<\/input>/gi, '')
            .replace(/<textarea\b[^<]*(?:(?!<\/textarea>))<\/textarea>/gi, '')
            .replace(/<button\b[^<]*(?:(?!<\/button>))<\/button>/gi, '')
            .replace(/<select\b[^<]*(?:(?!<\/select>))<\/select>/gi, '')
            .replace(/<option\b[^<]*(?:(?!<\/option>))<\/option>/gi, '')
            .replace(/<optgroup\b[^<]*(?:(?!<\/optgroup>))<\/optgroup>/gi, '')
            .replace(/<fieldset\b[^<]*(?:(?!<\/fieldset>))<\/fieldset>/gi, '')
            .replace(/<legend\b[^<]*(?:(?!<\/legend>))<\/legend>/gi, '')
            .replace(/<label\b[^<]*(?:(?!<\/label>))<\/label>/gi, '')
            .replace(/<datalist\b[^<]*(?:(?!<\/datalist>))<\/datalist>/gi, '')
            .replace(/<output\b[^<]*(?:(?!<\/output>))<\/output>/gi, '')
            .replace(/<progress\b[^<]*(?:(?!<\/progress>))<\/progress>/gi, '')
            .replace(/<meter\b[^<]*(?:(?!<\/meter>))<\/meter>/gi, '')
            .replace(/<details\b[^<]*(?:(?!<\/details>))<\/details>/gi, '')
            .replace(/<summary\b[^<]*(?:(?!<\/summary>))<\/summary>/gi, '')
            .replace(/<dialog\b[^<]*(?:(?!<\/dialog>))<\/dialog>/gi, '')
            .replace(/<template\b[^<]*(?:(?!<\/template>))<\/template>/gi, '')
            .replace(/<canvas\b[^<]*(?:(?!<\/canvas>))<\/canvas>/gi, '')
            .replace(/<svg\b[^<]*(?:(?!<\/svg>))<\/svg>/gi, '')
            .replace(/<math\b[^<]*(?:(?!<\/math>))<\/math>/gi, '')
            .replace(/<video\b[^<]*(?:(?!<\/video>))<\/video>/gi, '')
            .replace(/<audio\b[^<]*(?:(?!<\/audio>))<\/audio>/gi, '')
            .replace(/<source\b[^<]*(?:(?!<\/source>))<\/source>/gi, '')
            .replace(/<track\b[^<]*(?:(?!<\/track>))<\/track>/gi, '')
            .replace(/<track\b[^<]*(?:(?!<\/track>))<\/track>/gi, '')
        return sanitized
    }
    return {
        sanitizeHtml,
        containerRef
    }
}