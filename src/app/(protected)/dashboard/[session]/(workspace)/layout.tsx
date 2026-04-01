import { SubscriptionEntitlementQuery } from '@/convex/query.config'
import { combinedSlug } from '@/lib/utils'
import { redirect } from 'next/navigation'
import Navbar from '@/components/navbar'
import React from 'react'

type Props = {
    children: React.ReactNode
    params: Promise<{ session: string }>
}

const Layout = async ({ children, params }: Props) => {
    const { session } = await params
    const { profileName, entitlement } = await SubscriptionEntitlementQuery()
    const target = combinedSlug(profileName || 'User')

    if (!entitlement) {
        redirect(`/billing/${target}`)
    }

    return (
        // No padding-top here — HomeShell is full-screen and manages its own layout.
        // Navbar returns null on the home route, and renders the slim bar on canvas/style-guide.
        <div className='min-h-screen'>
            <Navbar />
            {children}
        </div>
    )
}

export default Layout