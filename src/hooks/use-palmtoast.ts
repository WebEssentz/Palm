import { useContext } from 'react'
import { PalmToastContext, ToastOptions } from '@/components/ui/palm-toast'

export function usePalmToast() {
    const ctx = useContext(PalmToastContext)
    if (!ctx) throw new Error('usePalmToast must be used within PalmToastProvider')

    return {
        toast: (message: string, options?: ToastOptions) => ctx.addToast(message, options),
    }
}