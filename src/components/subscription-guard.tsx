'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/redux/store'

interface SubscriptionGuardProps {
    children: React.ReactNode
    requirePro?: boolean
}

export const SubscriptionGuard = ({ children, requirePro = false }: SubscriptionGuardProps) => {
    const router = useRouter()
    const subscription = useAppSelector((state) => state.profile?.subscription)
    const isPro = subscription?.status === 'active'

    useEffect(() => {
        // If pro access is required and user isn't pro, redirect to billing
        if (requirePro && !isPro) {
            router.push('/billing')
        }
    }, [isPro, requirePro, router])

    // If checking for pro and user isn't pro, don't render children
    if (requirePro && !isPro) {
        return null
    }

    return <>{children}</>
}
