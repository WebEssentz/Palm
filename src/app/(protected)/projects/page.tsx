'use client'
/**
 * /projects — main workspace page.
 *
 * Replaces the old /dashboard/[session]/(workspace)/projects route.
 * Renders the same HomeShell but lives at a clean, session-free URL.
 * The layout above this page (src/app/(protected)/layout.tsx) handles
 * auth gating via the middleware + Convex auth provider, so no extra
 * entitlement check is needed here.
 */
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import ProjectsProvider from '@/components/projects/list/provider'
import HomeShell from '@/components/home/shell'

export default function ProjectsPage() {
    const me = useQuery(api.user.getCurrentUser)
    const projects = useQuery(
        api.projects.getUserProjects,
        me?._id ? { userId: me._id as Id<'users'> } : 'skip'
    )

    // Suspend until both queries resolve (Convex returns undefined while loading)
    if (!me || projects === undefined) return null

    return (
        <ProjectsProvider initialProjects={projects}>
            <HomeShell profile={{ name: me.name || '', image: me.image }} />
        </ProjectsProvider>
    )
}
