import { SubscriptionEntitlementQuery } from '@/convex/query.config'
import { combinedSlug } from '@/lib/utils'
import { redirect } from 'next/navigation'

const Page = async () => {
  const { entitlement, profileName } = await SubscriptionEntitlementQuery()
  
  // Free users (no active subscription) → redirect to billing
  if (!entitlement) {
    console.log('[Dashboard] No entitlement - redirecting to billing')
    redirect(`/billing/${combinedSlug(profileName!)}`)
  }
  
  // Pro users → go to canvas
  console.log('[Dashboard] Entitlement found - redirecting to canvas')
  redirect(`/dashboard/${combinedSlug(profileName!)}`)
}

export default Page