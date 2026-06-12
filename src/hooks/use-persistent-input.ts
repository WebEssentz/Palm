import { useEffect, useRef, useState, useCallback } from 'react'
import type { ImageItem } from '@/components/home/image-preview'

const STORAGE_KEY = 'palm_home_input'
const DEBOUNCE_MS = 300

interface PersistedState {
    prompt: string
    urlTags: string[]
    imageUrls: Array<{
        id: string
        url: string
        storageId: string
    }>
}

function load(): PersistedState {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return { prompt: '', urlTags: [], imageUrls: [] }
        return JSON.parse(raw)
    } catch {
        return { prompt: '', urlTags: [], imageUrls: [] }
    }
}

function save(state: PersistedState) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {}
}

export function usePersistentInput() {
    const saved = typeof window !== 'undefined' ? load() : { prompt: '', urlTags: [], imageUrls: [] }

    const [prompt, setPromptState] = useState(saved.prompt)
    const [urlTags, setUrlTagsState] = useState(saved.urlTags)

    // Reconstruct ImageItems from saved URLs — storageId already known, previewUrl from /api/storage
    const [uploadedImages, setUploadedImagesState] = useState(
        saved.imageUrls.map(img => ({
            id: img.id,
            previewUrl: `/api/storage/${img.storageId}`,
            storageId: img.storageId,
            error: false,
        })) as ImageItem[]
    )

    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    const persist = useCallback((
        nextPrompt: string,
        nextUrlTags: string[],
        nextImages: ImageItem[]
    ) => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            save({
                prompt: nextPrompt,
                urlTags: nextUrlTags,
                // Only save images that finished uploading
                imageUrls: nextImages
                    .filter(img => img.storageId && !img.error)
                    .map(img => ({
                        id: img.id,
                        url: `/api/storage/${img.storageId}`,
                        storageId: img.storageId as string,
                    })),
            })
        }, DEBOUNCE_MS)
    }, [])

    const setPrompt = useCallback((val: string | ((prev: string) => string)) => {
        setPromptState(prev => {
            const next = typeof val === 'function' ? val(prev) : val
            persist(next, urlTags, uploadedImages)
            return next
        })
    }, [urlTags, uploadedImages, persist])

    const setUrlTags = useCallback((val: string[] | ((prev: string[]) => string[])) => {
        setUrlTagsState(prev => {
            const next = typeof val === 'function' ? val(prev) : val
            persist(prompt, next, uploadedImages)
            return next
        })
    }, [prompt, uploadedImages, persist])

    const setUploadedImages = useCallback((val: ImageItem[] | ((prev: ImageItem[]) => ImageItem[])) => {
        setUploadedImagesState(prev => {
            const next = typeof val === 'function' ? val(prev) : val
            persist(prompt, urlTags, next)
            return next
        })
    }, [prompt, urlTags, persist])

    const clearPersistedInput = useCallback(() => {
        try { localStorage.removeItem(STORAGE_KEY) } catch {}
        setPromptState('')
        setUrlTagsState([])
        setUploadedImagesState([])
    }, [])

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [])

    return {
        prompt,
        setPrompt,
        urlTags,
        setUrlTags,
        uploadedImages,
        setUploadedImages,
        clearPersistedInput,
    }
}
