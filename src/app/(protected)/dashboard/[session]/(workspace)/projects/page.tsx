'use client'
import { useQuery } from 'convex/react'
import { api } from '../../../../../../../convex/_generated/api'
import { Id } from '../../../../../../../convex/_generated/dataModel'
import ProjectsProvider from '@/components/projects/list/provider'
import HomeShell from '@/components/home/shell'

export default function Page() {
    const me = useQuery(api.user.getCurrentUser)
    const projects = useQuery(
        api.projects.getUserProjects,
        me?._id ? { userId: me._id as Id<'users'> } : 'skip'
    )

    if (!me || projects === undefined) return null

    return (
        <ProjectsProvider initialProjects={projects}>
            <HomeShell profile={{ name: me.name || '', image: me.image }} view='projects' />
        </ProjectsProvider>
    )
}