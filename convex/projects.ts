import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
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
        name: v.string(),
        prompt: v.optional(v.string()),
        userId: v.optional(v.id('users')),
        sketchesData: v.optional(v.any()),
        thumbnail: v.optional(v.string()),
        referenceUrls: v.optional(v.array(v.string())),
    },
    handler: async (ctx, {
        name,
        prompt,
        userId: providedUserId,
        sketchesData,
        thumbnail,
        referenceUrls
    }) => {
        // Get userId from auth if not provided
        const authUserId = await getAuthUserId(ctx)
        const userId = providedUserId || authUserId
        
        if (!userId) {
            throw new Error("Unauthorized")
        }

        console.log('[CONVEX] Creating a project for the user:', userId)
        const projectNumber = await getNextProjectNumber(ctx, userId)
        const projectName = name || `Project ${projectNumber}`

        const projectId = await ctx.db.insert('projects', {
            userId,
            name: projectName,
            prompt,
            sketchesData: sketchesData || {},
            thumbnail,
            referenceUrls,
            projectNumber,
            lastModified: Date.now(),
            createdAt: Date.now(),
            isPublic: false,
        })
        
        console.log('[CONVEX] Project created with prompt:', !!prompt)

        return projectId
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

        return projects
            .filter((project: any) => !project.is_deleted)
            .map((project) => ({
                _id: project._id,
                name: project.name,
                projectNumber: project.projectNumber,
                thumbnail: project.thumbnail,
                lastModified: project.lastModified,
                createdAt: project.createdAt,
                isPublic: project.isPublic,
            }))
    },
})

export const getDeletedProjects = query({
    args: {
        userId: v.id('users'),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { userId, limit = 20 }) => {
        const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
        const cutoff = Date.now() - THREE_DAYS_MS

        const projects = await ctx.db
            .query('projects')
            .withIndex('by_userId_lastModified', (q: any) => q.eq('userId', userId))
            .order('desc')
            .take(limit ?? 20)

        return projects
            .filter((project: any) => project.is_deleted && project.deleted_at && project.deleted_at > cutoff)
            .map((project) => ({
                _id: project._id,
                name: project.name,
                projectNumber: project.projectNumber,
                thumbnail: project.thumbnail,
                lastModified: project.lastModified,
                createdAt: project.createdAt,
                isPublic: project.isPublic,
                deleted_at: project.deleted_at,
            }))
    },
})

export const hasDeletedProjects = query({
    args: {
        userId: v.id('users'),
    },
    handler: async (ctx, { userId }) => {
        const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
        const cutoff = Date.now() - THREE_DAYS_MS

        const projects = await ctx.db
            .query('projects')
            .withIndex('by_userId_lastModified', (q: any) => q.eq('userId', userId))
            .collect()

        const hasDeleted = projects.some(
            (project: any) => project.is_deleted && project.deleted_at && project.deleted_at > cutoff
        )
        
        return hasDeleted
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

export const updateProjectSketches = mutation({
    args: {
        projectId: v.id('projects'),
        sketchesData: v.any(),
        viewportData: v.optional(v.any()),
    },
    handler: async (ctx, { projectId, sketchesData, viewportData }) => {
        const project = await ctx.db.get(projectId)
        if (!project) throw new Error("Project not found")

        const updateData: any = {
            sketchesData,
            lastModified: Date.now()
        }
        
        if (viewportData) {
            updateData.viewportData = viewportData
        }

        await ctx.db.patch(projectId, updateData)
        return { success: true }
    }
})

export const updateProjectStyleGuide = mutation({
    args: {
        projectId: v.id('projects'),
        styleGuide: v.any(),
    },
    handler: async (ctx, { projectId, styleGuide }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error("Unauthenticated")

        const project = await ctx.db.get(projectId)
        if (!project) throw new Error("Project not found")

        if (project.userId !== userId) {
            throw new Error("Access Denied")
        }

        // Only set thumbnail if one isn't already set (preserve gradients)
        let thumbnailColor = '#888888'
        if (styleGuide?.colorSections && styleGuide.colorSections.length > 0) {
            const primarySection = styleGuide.colorSections[0]
            if (primarySection?.swatches && primarySection.swatches.length > 0) {
                thumbnailColor = primarySection.swatches[0].hexColor
            }
        }

        const patchData: any = { 
            styleGuides: JSON.stringify(styleGuide), 
            lastModified: Date.now() 
        }

        if (!project.thumbnail) {
            patchData.thumbnail = thumbnailColor
        }

        await ctx.db.patch(projectId, patchData)
        return { success: true, styleGuide }
    }
})

export const renameProject = mutation({
    args: {
        projectId: v.id('projects'),
        newName: v.string(),
    },
    handler: async (ctx, { projectId, newName }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error("Unauthenticated")

        const project = await ctx.db.get(projectId)
        if (!project) throw new Error("Project not found")

        if (project.userId !== userId) {
            throw new Error("Access Denied")
        }

        const trimmedName = newName.trim()
        if (!trimmedName) throw new Error("Project name cannot be empty")

        await ctx.db.patch(projectId, {
            name: trimmedName,
            lastModified: Date.now(),
        })

        return { success: true, name: trimmedName }
    }
})

export const deleteProject = mutation({
    args: {
        projectId: v.id('projects'),
    },
    handler: async (ctx, { projectId }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error("Unauthenticated")

        const project = await ctx.db.get(projectId)
        if (!project) throw new Error("Project not found")

        if (project.userId !== userId) {
            throw new Error("Access Denied")
        }

        // Soft delete: mark as deleted with timestamp
        await ctx.db.patch(projectId, {
            is_deleted: true,
            deleted_at: Date.now(),
        })

        return { success: true }
    }
})

export const restoreProject = mutation({
    args: {
        projectId: v.id('projects'),
    },
    handler: async (ctx, { projectId }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error("Unauthenticated")

        const project = await ctx.db.get(projectId)
        if (!project) throw new Error("Project not found")

        if (project.userId !== userId) {
            throw new Error("Access Denied")
        }

        // Restore: remove delete flags
        await ctx.db.patch(projectId, {
            is_deleted: false,
            deleted_at: undefined as any,
        })

        return { success: true }
    }
})

export const deleteAllDeletedProjects = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error("Unauthenticated")

        const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
        const cutoff = Date.now() - THREE_DAYS_MS

        const deletedProjects = await ctx.db
            .query('projects')
            .withIndex('by_userId_lastModified', (q: any) => q.eq('userId', userId))
            .collect()

        // Filter for projects that are deleted and within the 3-day window
        const projectsToDelete = deletedProjects.filter(
            (project: any) => project.is_deleted && project.deleted_at && project.deleted_at > cutoff
        )

        // Hard delete all of them
        for (const project of projectsToDelete) {
            await ctx.db.delete(project._id)
        }

        return { success: true, deletedCount: projectsToDelete.length }
    }
})

export const permanentlyDeleteProject = mutation({
    args: {
        projectId: v.id('projects'),
    },
    handler: async (ctx, { projectId }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error("Unauthenticated")

        const project = await ctx.db.get(projectId)
        if (!project) throw new Error("Project not found")

        if (project.userId !== userId) {
            throw new Error("Access Denied")
        }

        // Hard delete — gone forever
        await ctx.db.delete(projectId)
        return { success: true }
    }
})

export const fixLegacyThumbnails = mutation({
    args: {},
    handler: async (ctx) => {
        const projects = await ctx.db.query('projects').collect()
        let fixed = 0
        for (const project of projects) {
            const doc = project as any
            if (doc.thumbnailColor !== undefined) {
                // Move thumbnailColor → thumbnail, delete the bad field
                await ctx.db.patch(project._id, {
                    thumbnail: doc.thumbnailColor,
                    // Convex doesn't support undefined in patches, just leave it
                })
                fixed++
            }
        }
        return { fixed }
    }
})

export const hardDeleteExpiredProjects = internalMutation({
    args: {},
    handler: async (ctx) => {
        const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
        const cutoff = Date.now() - THREE_DAYS_MS

        const expiredProjects = await ctx.db
            .query('projects')
            .filter((q) =>
                q.and(
                    q.eq(q.field('is_deleted'), true),
                    q.lt(q.field('deleted_at'), cutoff)
                )
            )
            .collect()

        for (const project of expiredProjects) {
            await ctx.db.delete(project._id)
        }

        console.log(`[CRON] Hard deleted ${expiredProjects.length} expired project(s)`)
        return { deleted: expiredProjects.length }
    },
})