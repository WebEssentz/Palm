import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const saveSnapshot = mutation({
    args: {
        projectId: v.string(),
        shapeId: v.string(),
        storageId: v.id('_storage'),
    },
    handler: async (ctx, { projectId, shapeId, storageId }) => {
        const url = await ctx.storage.getUrl(storageId)
        if (!url) throw new Error('Failed to get URL')

        // Delete old snapshot if exists
        const existing = await ctx.db
            .query('generatedui_snapshots')
            .withIndex('by_shapeId', q => q.eq('shapeId', shapeId))
            .first()

        if (existing) {
            await ctx.storage.delete(existing.storageId as any)
            await ctx.db.delete(existing._id)
        }

        await ctx.db.insert('generatedui_snapshots', {
            projectId,
            shapeId,
            thumbnailUrl: url,
            storageId: storageId as string,
        })

        return { url }
    }
})

export const getSnapshot = query({
    args: { shapeId: v.string() },
    handler: async (ctx, { shapeId }) => {
        const snap = await ctx.db
            .query('generatedui_snapshots')
            .withIndex('by_shapeId', q => q.eq('shapeId', shapeId))
            .first()
        return { url: snap?.thumbnailUrl ?? null }
    }
})
