import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server"
import { fetchQuery, preloadQuery } from "convex/nextjs"
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
