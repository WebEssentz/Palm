import { SubscriptionEntitlementQuery } from '@/convex/query.config'
import { combinedSlug } from '@/lib/utils'
import { redirect } from 'next/navigation'

const Page = async () => {
  try {
    const { entitlement, profileName, profileId } = await SubscriptionEntitlementQuery()
    if (!profileName || !profileId) redirect('/auth/sign-in')
    const slug = combinedSlug(profileName, profileId)
    if (!entitlement) redirect(`/billing/${slug}`)
    redirect(`/dashboard/${slug}`)
  } catch {
    // SSR fetch failed (network/socket issue) — let client handle it
    redirect(`/dashboard/me`)
  }
}

export default Page