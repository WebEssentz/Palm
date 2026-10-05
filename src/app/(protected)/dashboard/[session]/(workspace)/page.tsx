'use client'
/**
 * This page is now unreachable — next.config.ts permanently redirects
 * /dashboard/:session → /projects before Next.js even looks at this file.
 * Kept as a no-op fallback in case the redirect is ever removed.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Page() {
    const router = useRouter()
    useEffect(() => { router.replace('/projects') }, [router])
    return null
}