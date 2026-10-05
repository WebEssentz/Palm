import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export type DbCtx = QueryCtx | MutationCtx;

/**
 * Asserts the caller is authenticated and returns their userId.
 */
export async function assertAuthenticated(ctx: DbCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthenticated");
  }
  return userId;
}

/**
 * Asserts the caller is a member of the workspace with given workspaceId.
 * Returns the authenticated userId, their membership record, and the workspace doc.
 */
export async function assertWorkspaceMember(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">
): Promise<{
  userId: Id<"users">;
  membership: Doc<"workspaceMembers">;
  workspace: Doc<"workspaces">;
}> {
  const userId = await assertAuthenticated(ctx);

  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspaceId_and_userId", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId)
    )
    .first();

  if (!membership) {
    throw new Error("Unauthorized: You are not a member of this workspace");
  }

  return { userId, membership, workspace };
}

/**
 * Asserts the caller is a member of the workspace identified by slug.
 */
export async function assertWorkspaceMemberBySlug(
  ctx: DbCtx,
  slug: string
): Promise<{
  userId: Id<"users">;
  membership: Doc<"workspaceMembers">;
  workspace: Doc<"workspaces">;
}> {
  const userId = await assertAuthenticated(ctx);

  const workspace = await ctx.db
    .query("workspaces")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspaceId_and_userId", (q) =>
      q.eq("workspaceId", workspace._id).eq("userId", userId)
    )
    .first();

  if (!membership) {
    throw new Error("Unauthorized: You are not a member of this workspace");
  }

  return { userId, membership, workspace };
}

/**
 * Verifies if a user has access to a project.
 * Rules:
 * 1. If project isPublic, read access is granted.
 * 2. If project has a workspaceId:
 *    - User must be a member of the workspace.
 *    - If project is 'private', user must be the creator (createdBy ?? userId).
 * 3. If legacy project without workspaceId:
 *    - project.userId must match current user.
 */
export async function assertProjectAccess(
  ctx: DbCtx,
  projectId: Id<"projects">,
  requireWrite = false
): Promise<{
  project: Doc<"projects">;
  userId: Id<"users"> | null;
  membership: Doc<"workspaceMembers"> | null;
  workspace: Doc<"workspaces"> | null;
}> {
  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const userId = await getAuthUserId(ctx);

  // Public project read access
  if (project.isPublic && !requireWrite) {
    return { project, userId, membership: null, workspace: null };
  }

  if (!userId) {
    throw new Error("Unauthenticated");
  }

  const creatorId = project.createdBy ?? project.userId;
  const isCreator = creatorId === userId;

  // Workspace-based project
  if (project.workspaceId) {
    const { membership, workspace } = await assertWorkspaceMember(ctx, project.workspaceId);

    // Private projects inside a workspace are visible only to their creator
    if (project.visibility === "private" && !isCreator) {
      throw new Error("Unauthorized: This project is private to its creator");
    }

    if (requireWrite) {
      // If private, only creator can write.
      // If workspace-visible, any workspace member (or creator) can write/edit.
      if (project.visibility === "private" && !isCreator) {
        throw new Error("Unauthorized: Only the creator can modify a private project");
      }
    }

    return { project, userId, membership, workspace };
  }

  // Legacy fallback: project owned directly by user
  if (!isCreator) {
    throw new Error("Unauthorized: Access Denied");
  }

  return { project, userId, membership: null, workspace: null };
}

/**
 * Checks if a project is visible to a given user in a workspace context.
 * Used for filtering lists of projects.
 * Privacy rule: visible if visibility === 'workspace' (or undefined legacy) OR createdBy === me.
 */
export function isProjectVisibleToUser(
  project: {
    visibility?: "workspace" | "private";
    createdBy?: Id<"users">;
    userId: Id<"users">;
    isPublic?: boolean;
  },
  userId: Id<"users">
): boolean {
  if (project.isPublic) return true;
  const creatorId = project.createdBy ?? project.userId;
  if (creatorId === userId) return true;
  return project.visibility === "workspace" || !project.visibility;
}

/**
 * Checks folder access within a workspace.
 */
export async function assertFolderAccess(
  ctx: DbCtx,
  folderId: Id<"folders">,
  requireWrite = false
): Promise<{
  folder: Doc<"folders">;
  userId: Id<"users">;
  membership: Doc<"workspaceMembers">;
  workspace: Doc<"workspaces">;
}> {
  const folder = await ctx.db.get(folderId);
  if (!folder) {
    throw new Error("Folder not found");
  }

  const { userId, membership, workspace } = await assertWorkspaceMember(
    ctx,
    folder.workspaceId
  );

  const isCreator = folder.createdBy === userId;

  if (folder.visibility === "private" && !isCreator) {
    throw new Error("Unauthorized: This folder is private to its creator");
  }

  if (requireWrite && !isCreator && membership.role === "member") {
    // Member cannot edit someone else's folder, but admin/owner can manage
    throw new Error("Unauthorized: Insufficient permissions to modify this folder");
  }

  return { folder, userId, membership, workspace };
}
