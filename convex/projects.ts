import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
    assertProjectAccess,
    assertWorkspaceMember,
    assertFolderAccess,
} from "./permissions";
import { ensurePersonalWorkspace } from "./workspaces";

export const getProject = query({
    args: { projectId: v.id('projects') },
    handler: async (ctx, { projectId }) => {
        const { project } = await assertProjectAccess(ctx, projectId);
        return project;
    }
})

export const createProject = mutation({
    args: {
        name: v.optional(v.string()),
        prompt: v.optional(v.string()),
        userId: v.optional(v.id('users')),
        sketchesData: v.optional(v.any()),
        thumbnail: v.optional(v.string()),
        referenceUrls: v.optional(v.array(v.string())),
        workspaceId: v.optional(v.id('workspaces')),
        visibility: v.optional(v.union(v.literal('workspace'), v.literal('private'))),
        folderId: v.optional(v.id('folders')),
    },
    handler: async (ctx, {
        name,
        prompt,
        userId: providedUserId,
        sketchesData,
        thumbnail,
        referenceUrls,
        workspaceId: providedWorkspaceId,
        visibility = "workspace",
        folderId,
    }) => {
        // Get userId from auth if not provided
        const authUserId = await getAuthUserId(ctx)
        const userId = providedUserId || authUserId
        
        if (!userId) {
            throw new Error("Unauthorized")
        }

        // Determine workspace
        let targetWorkspaceId = providedWorkspaceId
        if (targetWorkspaceId) {
            await assertWorkspaceMember(ctx, targetWorkspaceId)
        } else {
            const personalWs = await ensurePersonalWorkspace(ctx, userId)
            targetWorkspaceId = personalWs._id
        }

        // If folderId is provided, verify it belongs to this workspace
        if (folderId) {
            const { folder } = await assertFolderAccess(ctx, folderId)
            if (folder.workspaceId !== targetWorkspaceId) {
                throw new Error("Folder does not belong to the target workspace")
            }
        }

        console.log('[CONVEX] Creating a project for the user:', userId, 'in workspace:', targetWorkspaceId)
        const projectNumber = await getNextProjectNumber(ctx, userId)
        const projectName = name || `Project ${projectNumber}`
        const now = Date.now()

        const projectId = await ctx.db.insert('projects', {
            userId,
            workspaceId: targetWorkspaceId,
            visibility,
            createdBy: userId,
            folderId,
            name: projectName,
            prompt,
            sketchesData: sketchesData || {},
            thumbnail,
            referenceUrls,
            projectNumber,
            lastModified: now,
            createdAt: now,
            isPublic: false,
        })
        
        console.log('[CONVEX] Project created with prompt:', !!prompt)

        return {
            _id: projectId,
            name: projectName,
            projectNumber,
            thumbnail,
            lastModified: now,
            createdAt: now,
            isPublic: false,
            workspaceId: targetWorkspaceId,
            visibility,
            createdBy: userId,
            folderId,
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

export const getWorkspaceProjects = query({
    args: {
        workspaceId: v.id('workspaces'),
        folderId: v.optional(v.id('folders')),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { workspaceId, folderId, limit = 50 }) => {
        const { userId } = await assertWorkspaceMember(ctx, workspaceId);

        const projects = await ctx.db
            .query('projects')
            .withIndex('by_workspaceId_and_lastModified', (q) =>
                q.eq('workspaceId', workspaceId)
            )
            .order('desc')
            .take(limit ?? 50);

        return projects
            .filter((project) => {
                if (project.is_deleted) return false;
                if (folderId !== undefined && project.folderId !== folderId) return false;
                // Privacy check: visible if workspace-level OR created by the caller
                const creatorId = project.createdBy ?? project.userId;
                if (project.visibility === 'private' && creatorId !== userId) {
                    return false;
                }
                return true;
            })
            .map((project) => ({
                _id: project._id,
                name: project.name,
                projectNumber: project.projectNumber,
                thumbnail: project.thumbnail,
                thumbnailStorageId: project.thumbnailStorageId,
                lastEditedBy: project.lastEditedBy,
                lastModified: project.lastModified,
                createdAt: project.createdAt,
                isPublic: project.isPublic,
                workspaceId: project.workspaceId,
                visibility: project.visibility,
                createdBy: project.createdBy ?? project.userId,
                folderId: project.folderId,
                isPinned: project.isPinned ?? false,
            }));
    },
});

export const updateProjectVisibility = mutation({
    args: {
        projectId: v.id('projects'),
        visibility: v.union(v.literal('workspace'), v.literal('private')),
    },
    handler: async (ctx, { projectId, visibility }) => {
        const { project, userId } = await assertProjectAccess(ctx, projectId, true);
        const creatorId = project.createdBy ?? project.userId;
        if (creatorId !== userId) {
            throw new Error("Unauthorized: Only the creator can change project visibility");
        }

        await ctx.db.patch(projectId, {
            visibility,
            lastModified: Date.now(),
        });

        return { success: true, visibility };
    },
});

export const updateProjectFolder = mutation({
    args: {
        projectId: v.id('projects'),
        folderId: v.optional(v.id('folders')),
    },
    handler: async (ctx, { projectId, folderId }) => {
        const { project } = await assertProjectAccess(ctx, projectId, true);

        if (folderId) {
            const { folder } = await assertFolderAccess(ctx, folderId);
            if (project.workspaceId && folder.workspaceId !== project.workspaceId) {
                throw new Error("Folder does not belong to the project's workspace");
            }
        }

        await ctx.db.patch(projectId, {
            folderId: folderId ?? undefined,
            lastModified: Date.now(),
        });

        return { success: true, folderId };
    },
});

export const getUserProjects = query({
    args: {
        userId: v.id('users'),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { userId, limit = 20 }) => {
        const authUserId = await getAuthUserId(ctx);

        const projects = await ctx.db
            .query('projects')
            .withIndex('by_userId_lastModified', (q: any) => q.eq('userId', userId))
            .order('desc')
            .take(limit ?? 20)

        return projects
            .filter((project: any) => {
                if (project.is_deleted) return false;
                const creatorId = project.createdBy ?? project.userId;
                if (project.visibility === 'private' && creatorId !== authUserId) {
                    return false;
                }
                return true;
            })
            .map((project) => ({
                _id: project._id,
                name: project.name,
                projectNumber: project.projectNumber,
                thumbnail: project.thumbnail,
                thumbnailStorageId: project.thumbnailStorageId,
                lastEditedBy: project.lastEditedBy,
                lastModified: project.lastModified,
                createdAt: project.createdAt,
                isPublic: project.isPublic,
                workspaceId: project.workspaceId,
                visibility: project.visibility,
                createdBy: project.createdBy ?? project.userId,
                folderId: project.folderId,
                isPinned: project.isPinned ?? false,
            }))
    },
})

export const duplicateProjects = mutation({
    args: { projectIds: v.array(v.id('projects')) },
    handler: async (ctx, { projectIds }) => {
        const createdIds: string[] = []
        for (const projectId of projectIds) {
            const { project, userId } = await assertProjectAccess(ctx, projectId)
            const now = Date.now()
            const targetUserId = userId ?? project.userId
            const projectNumber = await getNextProjectNumber(ctx, targetUserId)
            const newId = await ctx.db.insert('projects', {
                userId: targetUserId,
                workspaceId: project.workspaceId,
                visibility: project.visibility,
                createdBy: userId ?? project.createdBy ?? project.userId,
                folderId: project.folderId,
                name: `${project.name} (Copy)`,
                prompt: project.prompt,
                styleGuides: project.styleGuides,
                sketchesData: project.sketchesData,
                viewportData: project.viewportData,
                generatedDesignData: project.generatedDesignData,
                thumbnail: project.thumbnail,
                thumbnailStorageId: project.thumbnailStorageId,
                lastEditedBy: userId ?? undefined,
                moodBoardImages: project.moodBoardImages,
                inspirationImages: project.inspirationImages,
                referenceUrls: project.referenceUrls,
                tags: project.tags,
                projectNumber,
                isPinned: false,
                lastModified: now,
                createdAt: now,
                isPublic: false,
            })
            createdIds.push(newId)
        }
        return { success: true, createdIds }
    }
})

export const moveProjectsToFolder = mutation({
    args: {
        projectIds: v.array(v.id('projects')),
        folderId: v.optional(v.id('folders')),
    },
    handler: async (ctx, { projectIds, folderId }) => {
        if (folderId) {
            await assertFolderAccess(ctx, folderId)
        }
        for (const projectId of projectIds) {
            await assertProjectAccess(ctx, projectId, true)
            await ctx.db.patch(projectId, {
                folderId: folderId ?? undefined,
                lastModified: Date.now(),
            })
        }
        return { success: true }
    }
})

export const togglePinProjects = mutation({
    args: {
        projectIds: v.array(v.id('projects')),
        pinned: v.boolean(),
    },
    handler: async (ctx, { projectIds, pinned }) => {
        for (const projectId of projectIds) {
            await assertProjectAccess(ctx, projectId, true)
            await ctx.db.patch(projectId, {
                isPinned: pinned,
                lastModified: Date.now(),
            })
        }
        return { success: true, pinned }
    }
})

export const deleteProjects = mutation({
    args: {
        projectIds: v.array(v.id('projects')),
    },
    handler: async (ctx, { projectIds }) => {
        const now = Date.now()
        for (const projectId of projectIds) {
            await assertProjectAccess(ctx, projectId, true)
            await ctx.db.patch(projectId, {
                is_deleted: true,
                deleted_at: now,
            })
        }
        return { success: true }
    }
})

export const updateProjectThumbnail = mutation({
    args: {
        projectId: v.id('projects'),
        storageId: v.id('_storage'),
    },
    handler: async (ctx, { projectId, storageId }) => {
        const { userId } = await assertProjectAccess(ctx, projectId, true);
        const url = await ctx.storage.getUrl(storageId);
        if (!url) throw new Error("Failed to get storage URL");

        // Delete old storage file if project already has a thumbnailStorageId
        const project = await ctx.db.get(projectId);
        if (project?.thumbnailStorageId) {
            try {
                await ctx.storage.delete(project.thumbnailStorageId);
            } catch (e) {
                console.error("Failed to delete previous thumbnail file", e);
            }
        }

        await ctx.db.patch(projectId, {
            thumbnailStorageId: storageId,
            thumbnail: url,
            lastEditedBy: userId ?? undefined,
            lastModified: Date.now(),
        });

        return { success: true, url, thumbnailStorageId: storageId };
    },
});

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
        const { project } = await assertProjectAccess(ctx, projectId)
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
        await assertProjectAccess(ctx, projectId, true)

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
        const { project } = await assertProjectAccess(ctx, projectId, true)

        const patchData: any = { 
            styleGuides: JSON.stringify(styleGuide), 
            lastModified: Date.now() 
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
        await assertProjectAccess(ctx, projectId, true)

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
        await assertProjectAccess(ctx, projectId, true)

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
        await assertProjectAccess(ctx, projectId, true)

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
        await assertProjectAccess(ctx, projectId, true)

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

export const clearColorThumbnails = mutation({
    args: {},
    handler: async (ctx) => {
        const projects = await ctx.db.query('projects').collect()
        let cleared = 0
        for (const project of projects) {
            if (
                project.thumbnail &&
                !project.thumbnail.startsWith('http://') &&
                !project.thumbnail.startsWith('https://') &&
                !project.thumbnail.startsWith('data:image/')
            ) {
                await ctx.db.patch(project._id, {
                    thumbnail: undefined,
                })
                cleared++
            }
        }
        return { cleared }
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