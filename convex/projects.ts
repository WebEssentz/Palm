import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";


export const getProject = query({
    args: { projectId: v.id('projects') },
    handler: async (ctx, { projectId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const project = await ctx.db.get(projectId);
        if (!project) throw new Error("Project not found");

        if (project.userId !== userId && !project.isPublic) throw new Error("Unauthorized");

        return project;
    }
})

export const createProject = mutation({
    args: {
        userId: v.id('users'),
        name: v.optional(v.string()),
        sketchesData: v.any(),
        thumbnail: v.optional(v.string()),
    },
    handler: async (ctx, {
        userId,
        name,
        sketchesData,
        thumbnail
    }) => {
        console.log('[CONVEX] Creating a project for the user:', userId)
        const projectNumber = await getNextProjectNumber(ctx, userId)
        const projectName = name || `Project ${projectNumber}`

        const projectId = await ctx.db.insert('projects', {
            userId,
            name: projectName,
            sketchesData,
            // Store thumbnail as-is, but we'll regenerate if needed
            thumbnail,
            projectNumber,
            lastModified: Date.now(),
            createdAt: Date.now(),
            isPublic: false,
        })
        
        console.log('[CONVEX] Project created with thumbnail:', !!thumbnail, 'length:', thumbnail?.length)

        return {
            projectId,
            name: projectName,
            projectNumber,
            thumbnail,
        }
    },
})

async function getNextProjectNumber(ctx: any, userId: string): Promise<number> {
    const counter = await ctx.db
        .query('project_counters')
        .withIndex('by_userId', (q: any) => q.eq('userId', userId))
        .first()
    if (!counter) {
        await ctx.db.insert('project_counters', {
            userId,
            nextProjectNumber: 2,
        })
        return 1
    }

    const projectNumber = counter.nextProjectNumber

    await ctx.db.patch(counter._id, {
        nextProjectNumber: projectNumber + 1,
    })

    return projectNumber
}

export const getUserProjects = query({
    args: {
        userId: v.id('users'),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { userId, limit = 20 }) => {
        const projects = await ctx.db
            .query('projects')
            .withIndex('by_userId_lastModified', (q: any) => q.eq('userId', userId))
            .order('desc')
            .take(limit ?? 20)

        return await Promise.all(projects.map(async (project) => ({
            _id: project._id,
            name: project.name,
            projectNumber: project.projectNumber,
            thumbnail: project.thumbnail 
                ? await ctx.storage.getUrl(project.thumbnail as any) 
                : undefined,
            lastModified: project.lastModified,
            createdAt: project.createdAt,
            isPublic: project.isPublic,
        })))
    },
})

export const getProjectStyleGuide = query({
    args: { projectId: v.id('projects') },
    handler: async (ctx, { projectId }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error("Unauthenticated")

        const project = await ctx.db.get(projectId)
        if (!project) throw new Error("Project not found")

        if (project.userId !== userId && !project.isPublic) {
            throw new Error("Access Denied")
        }

        return project.styleGuides ? JSON.parse(project.styleGuides) : null
    },
})