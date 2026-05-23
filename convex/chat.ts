import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const saveTurn = mutation({
    args: {
        projectId: v.string(),
        turnId: v.string(),
        prompt: v.string(),
        response: v.string(),
        timestamp: v.number(),
        urls: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        // Upsert — update if exists, insert if not
        const existing = await ctx.db
            .query('chatTurns')
            .withIndex('by_project', q => q.eq('projectId', args.projectId))
            .filter(q => q.eq(q.field('turnId'), args.turnId))
            .first()

        if (existing) {
            await ctx.db.patch(existing._id, {
                response: args.response,
            })
        } else {
            await ctx.db.insert('chatTurns', args)
        }
    },
})

export const getByProject = query({
    args: { projectId: v.string() },
    handler: async (ctx, { projectId }) => {
        return ctx.db
            .query('chatTurns')
            .withIndex('by_project', q => q.eq('projectId', projectId))
            .order('asc')
            .collect()
    },
})

export const clearByProject = mutation({
    args: { projectId: v.string() },
    handler: async (ctx, { projectId }) => {
        const turns = await ctx.db
            .query('chatTurns')
            .withIndex('by_project', q => q.eq('projectId', projectId))
            .collect()
        await Promise.all(turns.map(t => ctx.db.delete(t._id)))
    },
})
