import { mutation } from "./_generated/server";
import { ensurePersonalWorkspace } from "./workspaces";

/**
 * One-time migration to:
 * 1. Auto-create a personal workspace for each existing user (if they don't already have one)
 * 2. Assign any existing projects to the user's personal workspace
 * 3. Backfill `createdBy` and `visibility` on existing projects
 */
export const migrateUsersAndProjectsToWorkspaces = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Ensure all users have a personal workspace
    const users = await ctx.db.query("users").collect();
    let workspacesCreated = 0;
    const userToWorkspaceMap = new Map();

    for (const user of users) {
      const existingPersonal = await ctx.db
        .query("workspaces")
        .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
        .filter((q) => q.eq(q.field("isPersonal"), true))
        .first();

      if (existingPersonal) {
        userToWorkspaceMap.set(user._id, existingPersonal._id);
      } else {
        const personalWs = await ensurePersonalWorkspace(ctx, user._id);
        userToWorkspaceMap.set(user._id, personalWs._id);
        workspacesCreated++;
      }
    }

    // 2. Backfill projects with workspaceId, createdBy, and visibility
    const projects = await ctx.db.query("projects").collect();
    let projectsMigrated = 0;

    for (const project of projects) {
      const updates: Record<string, any> = {};

      if (!project.workspaceId) {
        let wsId = userToWorkspaceMap.get(project.userId);
        if (!wsId) {
          const personalWs = await ensurePersonalWorkspace(ctx, project.userId);
          wsId = personalWs._id;
          userToWorkspaceMap.set(project.userId, wsId);
        }
        updates.workspaceId = wsId;
      }

      if (!project.createdBy) {
        updates.createdBy = project.userId;
      }

      if (!project.visibility) {
        updates.visibility = "workspace";
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(project._id, updates);
        projectsMigrated++;
      }
    }

    return {
      usersProcessed: users.length,
      workspacesCreated,
      projectsTotal: projects.length,
      projectsMigrated,
    };
  },
});
