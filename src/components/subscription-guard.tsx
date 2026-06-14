// components/subscription-guard.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

interface SubscriptionGuardProps {
    children: React.ReactNode
    requirePro?: boolean
}

export const SubscriptionGuard = ({ children, requirePro = false }: SubscriptionGuardProps) => {
    const router = useRouter()
    const me = useQuery(api.user.getCurrentUser)
    const isPro = useQuery(
        api.subscription.hasEntitlement,
        me?._id ? { userId: me._id } : 'skip'
    )

    useEffect(() => {
        // If pro access is required and user isn't pro, redirect to billing
        if (requirePro && isPro === false) {
            router.push('/billing')
        }
    }, [isPro, requirePro, router])

    // If checking for pro and user isn't pro, don't render children
    if (requirePro && !isPro) {
        return null
    }

    return <>{children}</>
}