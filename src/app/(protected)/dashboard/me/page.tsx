'use client'
import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { combinedSlug } from '@/lib/utils'

export default function MePage() {
    const me = useQuery(api.user.getCurrentUser)
    const router = useRouter()

    useEffect(() => {
        if (me?.name && me?._id) {
            router.push(`/dashboard/${combinedSlug(me.name, me._id)}`)
        }
    }, [me, router])
    return null
}