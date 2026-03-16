import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server"
import { fetchMutation, fetchQuery, preloadQuery } from "convex/nextjs"
import { api } from "../../convex/_generated/api"
import { normalizeProfile, ConvexUserRaw } from "@/types/user"
import { Id } from "../../convex/_generated/dataModel"

export const ProfileQuery = async () => {
    return await preloadQuery(
        api.user.getCurrentUser,
        {},
        { token: await convexAuthNextjsToken() }
    )
}

export const SubscriptionEntitlementQuery = async () => {
    const token = await convexAuthNextjsToken()
    
    // Get profile
    const rawProfile = await fetchQuery(
        api.user.getCurrentUser,
        {},
        { token }
    )
    const profile = normalizeProfile(rawProfile as unknown as ConvexUserRaw | null)

    if (!profile?.id) return { entitlement: false, profileName: 'User' }

    // Get entitlement as actual value, not preloaded
    const entitlement = await fetchQuery(
        api.subscription.hasEntitlement,
        { userId: profile.id as Id<'users'> },
        { token }
    )

    return { 
        entitlement: !!entitlement,
        profileName: profile?.name || 'User' 
    }
}

export const ProjectQuery = async (projectId: string) => {
    const token = await convexAuthNextjsToken()
    const rawProfile = await fetchQuery(
        api.user.getCurrentUser,
        {},
        { token }
    )
    const profile = normalizeProfile(rawProfile as unknown as ConvexUserRaw | null)

    if (!profile?.id || !projectId || projectId === 'null') {
        return { project: null, profile: null }
    }

    const project = await preloadQuery(
        api.projects.getProject,
        { projectId: projectId as Id<'projects'> },
        { token }
    )

    return { project, profile }
}

export const ProjectsQuery = async () => {
    const token = await convexAuthNextjsToken()
    const rawProfile = await fetchQuery(
        api.user.getCurrentUser,
        {},
        { token }
    )
    const profile = normalizeProfile(rawProfile as unknown as ConvexUserRaw | null)
    if (!profile?.id) {
        return { projects: null, profile: null }
    }
    const projects = await preloadQuery(
        api.projects.getUserProjects,
        { userId: profile.id as Id<'users'> },
        { token }
    )
    return { projects, profile }
}

export const StyleGuideQuery = async (projectId: string) => {
    const styleGuide = await preloadQuery(
        api.projects.getProjectStyleGuide,
        { projectId: projectId as Id<'projects'> },
        { token: await convexAuthNextjsToken() }
    )
    return { styleGuide }
}

export const MoodBoardImagesQuery = async (projectId: string) => {
    const images = await preloadQuery(
        api.moodboard.getMoodBoardImages,
        { projectId: projectId as Id<'projects'> },
        { token: await convexAuthNextjsToken() }
    )
    return { images }
}

export const CreditsBalanceQuery = async () => {
    const rawProfile = await ProfileQuery()
    const profile = normalizeProfile(rawProfile._valueJSON as unknown as ConvexUserRaw | null)

    if (!profile?.id) return { ok: false, balance: 0, profile: null }

    const balance = await preloadQuery(
        api.subscription.getCreditsBalance,
        { userId: profile.id as Id<'users'> },
        { token: await convexAuthNextjsToken() }
    )

    return { ok: true, balance: balance._valueJSON, profile }
}

export const ConsumeCreditsQuery = async ({ amount }: { amount?: number }) => {
    const rawProfile = await ProfileQuery()
    const profile = normalizeProfile(rawProfile._valueJSON as unknown as ConvexUserRaw | null)

    if (!profile?.id) return { ok: false, profile: null, balance: 0 }

    const credits = await fetchMutation(
        api.subscription.consumeCredits,
        { 
            reason: 'ai:generation',
            amount: amount || 1,
            userId: profile.id as Id<'users'>,
            idempotencyKey: crypto.randomUUID()
        },
        { token: await convexAuthNextjsToken() }
    )

    return { ok: credits.ok, balance: credits.balance, profile }
}

export const RefundCreditsQuery = async ({ amount }: { amount?: number }) => {
    const rawProfile = await ProfileQuery()
    const profile = normalizeProfile(rawProfile._valueJSON as unknown as ConvexUserRaw | null)

    if (!profile?.id) return { ok: false, profile: null }

    const sub = await fetchQuery(
        api.subscription.getSubscriptionsForUser,
        { userId: profile.id as Id<'users'> },
        { token: await convexAuthNextjsToken() }
    )

    if (!sub) return { ok: false, error: 'subscription-not-found' }

    const result = await fetchMutation(
        api.subscription.grantCreditsIfNeeded,
        {
            subscriptionId: sub._id,
            amount: amount || 1,
            reason: 'refund:generation-failed',
            idempotencyKey: crypto.randomUUID()
        },
        { token: await convexAuthNextjsToken() }
    )

    return { ok: result.ok, balance: result.balance, profile }
}

export const InspirationImagesQuery = async (projectId: string) => {
    const images = await preloadQuery(
        api.inspiration.getInspirationImages,
        { projectId: projectId as Id<'projects'> },
        { token: await convexAuthNextjsToken() }
    )
    return { images }
}