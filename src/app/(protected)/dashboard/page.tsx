import { SubscriptionEntitlementQuery } from '@/convex/query.config'
import { combinedSlug } from '@/lib/utils'
import { redirect } from 'next/navigation'

const Page = async () => {
  const { entitlement, profileName } = await SubscriptionEntitlementQuery()
  if(!entitlement._valueJSON) {
    // redirect(`/billing/${combinedSlug(profileName!)}`)
    redirect(`/dashboard/${combinedSlug(profileName!)}`)
  }
  redirect(`/dashboard/${combinedSlug(profileName!)}`) // Redirect to main app page if entitlement exists
}

export default Page