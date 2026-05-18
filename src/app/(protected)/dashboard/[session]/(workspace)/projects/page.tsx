import React from 'react'
import { ProjectsQuery } from '@/convex/query.config'
import ProjectsProvider from '@/components/projects/list/provider'
import HomeShell from '@/components/home/shell'

const Page = async () => {
    const { projects, profile } = await ProjectsQuery()

    if (!profile || !projects) {
        return (
            <div className='flex min-h-screen items-center justify-center'>
                <div className='text-center space-y-2'>
                    <h1 className='text-xl font-medium text-foreground'>Authentication Required</h1>
                    <p className='text-sm text-muted-foreground'>You must be logged in to access this page.</p>
                </div>
            </div>
        )
    }

    return (
        <ProjectsProvider initialProjects={projects}>
            <HomeShell profile={{ name: profile.name || '', image: profile.image }} view='projects' />
        </ProjectsProvider>
    )
}

export default Page
