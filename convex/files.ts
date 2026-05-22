import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl()
})

export const getFileUrl = mutation({
    args: { storageId: v.string() },
    handler: async (ctx, { storageId }) => {
        return await ctx.storage.getUrl(storageId)
    }
})

export const deleteFile = mutation({
    args: { storageId: v.string() },
    handler: async (ctx, { storageId }) => {
        await ctx.storage.delete(storageId as any)
    }
})