import { SubscriptionEntitlementQuery } from '@/convex/query.config'
import { combinedSlug } from '@/lib/utils'
import { redirect } from 'next/navigation'
import Navbar from '@/components/navbar'
import React from 'react'

type Props = {
    children: React.ReactNode
    params: { session: string }
}
const Layout = async ({ children, params }: Props) => {
  const { profileName, entitlement } = await SubscriptionEntitlementQuery()
  const target = combinedSlug(profileName || 'User')
  // Only redirect when the computed target slug differs from the current session
  if (!entitlement._valueJSON && params?.session !== target) {
    redirect(`/dashboard/${target}`)
  }
  return (
    <div className='grid grid-cols-1'>
        <Navbar />
        {children}
    </div>
  )
}

export default Layout