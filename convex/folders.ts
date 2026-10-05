import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { assertWorkspaceMember, assertFolderAccess } from "./permissions";
import { ensurePersonalWorkspace } from "./workspaces";

/**
 * Creates a folder within a workspace.
 */
export const createFolder = mutation({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    name: v.string(),
    visibility: v.optional(v.union(v.literal("workspace"), v.literal("private"))),
  },
  handler: async (ctx, { workspaceId: providedWorkspaceId, name, visibility = "workspace" }) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) {
      throw new Error("Unauthorized");
    }

    let targetWorkspaceId = providedWorkspaceId;
    if (targetWorkspaceId) {
      await assertWorkspaceMember(ctx, targetWorkspaceId);
    } else {
      const personalWs = await ensurePersonalWorkspace(ctx, authUserId);
      targetWorkspaceId = personalWs._id;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Folder name cannot be empty");
    }

    const folderId = await ctx.db.insert("folders", {
      workspaceId: targetWorkspaceId,
      name: trimmedName,
      createdBy: authUserId,
      visibility,
      createdAt: Date.now(),
    });

    return await ctx.db.get(folderId);
  },
});

/**
 * Lists all folders created by the user or in their workspaces, with active project count.
 */
export const getUserFolders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const folders = await ctx.db
      .query("folders")
      .filter((q) => q.eq(q.field("createdBy"), userId))
      .collect();

    const foldersWithCount = await Promise.all(
      folders.map(async (folder) => {
        const projectsInFolder = await ctx.db
          .query("projects")
          .withIndex("by_folderId", (q) => q.eq("folderId", folder._id))
          .collect();
        const activeCount = projectsInFolder.filter((p) => !p.is_deleted).length;
        return {
          _id: folder._id,
          name: folder.name,
          visibility: folder.visibility,
          color: folder.color,
          emoji: folder.emoji,
          createdAt: folder.createdAt,
          projectCount: activeCount,
        };
      })
    );

    return foldersWithCount;
  },
});

/**
 * Lists all folders in a workspace accessible to the caller.
 * Private folders are only returned if created by the caller.
 */
export const getWorkspaceFolders = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, { workspaceId }) => {
    const { userId } = await assertWorkspaceMember(ctx, workspaceId);

    const folders = await ctx.db
      .query("folders")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    return folders.filter(
      (folder) =>
        folder.visibility === "workspace" || folder.createdBy === userId
    );
  },
});

/**
 * Renames a folder.
 */
export const renameFolder = mutation({
  args: {
    folderId: v.id("folders"),
    name: v.string(),
  },
  handler: async (ctx, { folderId, name }) => {
    await assertFolderAccess(ctx, folderId, true);

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Folder name cannot be empty");
    }

    await ctx.db.patch(folderId, {
      name: trimmedName,
    });

    return { success: true, name: trimmedName };
  },
});

/**
 * Deletes a folder and removes the folderId reference from any associated projects.
 */
export const deleteFolder = mutation({
  args: {
    folderId: v.id("folders"),
  },
  handler: async (ctx, { folderId }) => {
    await assertFolderAccess(ctx, folderId, true);

    // Unassign projects from this folder
    const projectsInFolder = await ctx.db
      .query("projects")
      .withIndex("by_folderId", (q) => q.eq("folderId", folderId))
      .collect();

    for (const project of projectsInFolder) {
      await ctx.db.patch(project._id, {
        folderId: undefined,
      });
    }

    await ctx.db.delete(folderId);
    return { success: true };
  },
});

/**
 * Updates a folder's background color.
 */
export const updateFolderColor = mutation({
  args: {
    folderId: v.id("folders"),
    color: v.optional(v.string()),
  },
  handler: async (ctx, { folderId, color }) => {
    await assertFolderAccess(ctx, folderId, true);
    await ctx.db.patch(folderId, {
      color: color || undefined,
    });
    return { success: true };
  },
});

/**
 * Updates a folder's emoji icon.
 */
export const updateFolderEmoji = mutation({
  args: {
    folderId: v.id("folders"),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, { folderId, emoji }) => {
    await assertFolderAccess(ctx, folderId, true);
    await ctx.db.patch(folderId, {
      emoji: emoji || undefined,
    });
    return { success: true };
  },
});
