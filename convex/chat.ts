import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { Id } from './_generated/dataModel'


// ── Chats / Threads Management ──

export const listChats = query({
    args: { projectId: v.string() },
    handler: async (ctx, { projectId }) => {
        return ctx.db
            .query('chats')
            .withIndex('by_project_updatedAt', q => q.eq('projectId', projectId))
            .order('desc')
            .collect()
    },
})

export const createChat = mutation({
    args: {
        projectId: v.string(),
        title: v.optional(v.string()),
    },
    handler: async (ctx, { projectId, title }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error('Unauthenticated')

        const now = Date.now()
        const chatId = await ctx.db.insert('chats', {
            projectId,
            userId,
            title: title || 'New chat',
            createdAt: now,
            updatedAt: now,
        })

        return chatId
    },
})

export const renameChat = mutation({
    args: {
        chatId: v.id('chats'),
        title: v.string(),
    },
    handler: async (ctx, { chatId, title }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error('Unauthenticated')

        const chat = await ctx.db.get(chatId)
        if (!chat || chat.userId !== userId) throw new Error('Not found or unauthorized')

        await ctx.db.patch(chatId, {
            title: title.trim(),
            updatedAt: Date.now(),
        })
    },
})

export const deleteChat = mutation({
    args: {
        chatId: v.id('chats'),
    },
    handler: async (ctx, { chatId }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error('Unauthenticated')

        const chat = await ctx.db.get(chatId)
        if (!chat || chat.userId !== userId) throw new Error('Not found or unauthorized')

        // Delete associated turns
        const turns = await ctx.db
            .query('chatTurns')
            .withIndex('by_chat', q => q.eq('chatId', chatId))
            .collect()

        await Promise.all(turns.map(t => ctx.db.delete(t._id)))
        await ctx.db.delete(chatId)
    },
})

export const getOrMigrateInitialChat = mutation({
    args: { projectId: v.string() },
    handler: async (ctx, { projectId }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) return null

        // Check if there are unassigned turns for this project (created before multi-chat)
        const unassignedTurns = await ctx.db
            .query('chatTurns')
            .withIndex('by_project', q => q.eq('projectId', projectId))
            .collect()

        const orphanTurns = unassignedTurns.filter(t => !t.chatId)

        if (orphanTurns.length > 0) {
            const firstPrompt = orphanTurns[0]?.prompt || 'Initial Chat'
            const title = firstPrompt.slice(0, 40)
            const now = Date.now()
            const newChatId = await ctx.db.insert('chats', {
                projectId,
                userId,
                title,
                createdAt: orphanTurns[0]?.timestamp || now,
                updatedAt: now,
            })

            // Assign legacy turns to this newChatId
            for (const turn of orphanTurns) {
                await ctx.db.patch(turn._id, { chatId: newChatId })
            }

            return newChatId
        }

        return null
    },
})

// ── Turns Management ──

export const saveTurn = mutation({
    args: {
        projectId: v.string(),
        chatId: v.optional(v.string()),
        turnId: v.string(),
        prompt: v.string(),
        response: v.string(),
        timestamp: v.number(),
        urls: v.optional(v.array(v.string())),
        imageStorageIds: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        // Upsert — update if exists, insert if not
        let existing = null

        if (args.chatId) {
            existing = await ctx.db
                .query('chatTurns')
                .withIndex('by_chat', q => q.eq('chatId', args.chatId))
                .filter(q => q.eq(q.field('turnId'), args.turnId))
                .first()
        }

        if (!existing) {
            existing = await ctx.db
                .query('chatTurns')
                .withIndex('by_project', q => q.eq('projectId', args.projectId))
                .filter(q => q.eq(q.field('turnId'), args.turnId))
                .first()
        }

        if (existing) {
            await ctx.db.patch(existing._id, {
                response: args.response,
                chatId: args.chatId || existing.chatId,
            })
        } else {
            await ctx.db.insert('chatTurns', args)
        }

        // If chatId is provided, update chat's updatedAt
        if (args.chatId) {
            try {
                const chatDoc = await ctx.db.get(args.chatId as Id<'chats'>)
                if (chatDoc) {
                    await ctx.db.patch(chatDoc._id, { updatedAt: Date.now() })
                }
            } catch {
                // Ignore if chatId is not a valid Convex ID
            }
        }
    },
})

export const getByChat = query({
    args: { chatId: v.string() },
    handler: async (ctx, { chatId }) => {
        return ctx.db
            .query('chatTurns')
            .withIndex('by_chat', q => q.eq('chatId', chatId))
            .order('asc')
            .collect()
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

        const chats = await ctx.db
            .query('chats')
            .withIndex('by_project', q => q.eq('projectId', projectId))
            .collect()
        await Promise.all(chats.map(c => ctx.db.delete(c._id)))
    },
})
