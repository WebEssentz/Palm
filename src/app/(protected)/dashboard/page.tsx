import { SubscriptionEntitlementQuery } from '@/convex/query.config'
import { combinedSlug } from '@/lib/utils'
import { redirect } from 'next/navigation'

const Page = async ({ searchParams }: { searchParams: { addAccount?: string } }) => {
    const { entitlement, profileName } = await SubscriptionEntitlementQuery()

    const slug = combinedSlug(profileName!)

    if (!entitlement) {
        redirect(`/billing/${slug}`)
    }

    redirect(`/dashboard/${slug}`)
}

export default Page