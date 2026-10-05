import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import {
  assertAuthenticated,
  assertWorkspaceMember,
  assertWorkspaceMemberBySlug,
} from "./permissions";

/**
 * Normalizes text to a URL-safe slug.
 */
function slugify(text: string): string {
  const slug = text
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "workspace";
}

/**
 * Generates a unique slug for a workspace.
 */
async function generateUniqueSlug(
  ctx: MutationCtx,
  preferredSlug: string
): Promise<string> {
  const baseSlug = slugify(preferredSlug);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await ctx.db
      .query("workspaces")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Helper to ensure a personal workspace exists for the user.
 */
export async function ensurePersonalWorkspace(
  ctx: MutationCtx,
  userId: Id<"users">
) {
  // Check if personal workspace already exists for this user
  const personalWorkspace = await ctx.db
    .query("workspaces")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
    .filter((q) => q.eq(q.field("isPersonal"), true))
    .first();

  if (personalWorkspace) {
    // Check and create owner membership if missing
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspaceId_and_userId", (q) =>
        q.eq("workspaceId", personalWorkspace._id).eq("userId", userId)
      )
      .first();

    if (!membership) {
      await ctx.db.insert("workspaceMembers", {
        workspaceId: personalWorkspace._id,
        userId,
        role: "owner",
        joinedAt: Date.now(),
      });
    }

    return personalWorkspace;
  }

  const user = await ctx.db.get(userId);
  const displayName = user?.name || user?.email?.split("@")[0] || "Personal";
  const name = `${displayName}'s Workspace`;
  const baseSlug = user?.name || user?.email?.split("@")[0] || "personal";
  const slug = await generateUniqueSlug(ctx, baseSlug);
  const now = Date.now();

  const workspaceId = await ctx.db.insert("workspaces", {
    name,
    slug,
    ownerId: userId,
    isPersonal: true,
    createdAt: now,
  });

  await ctx.db.insert("workspaceMembers", {
    workspaceId,
    userId,
    role: "owner",
    joinedAt: now,
  });

  const created = await ctx.db.get(workspaceId);
  return created!;
}

/**
 * Creates a new workspace.
 */
export const createWorkspace = mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, { name, slug: customSlug }) => {
    const userId = await assertAuthenticated(ctx);

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Workspace name cannot be empty");
    }

    const slug = await generateUniqueSlug(ctx, customSlug || trimmedName);
    const now = Date.now();

    const workspaceId = await ctx.db.insert("workspaces", {
      name: trimmedName,
      slug,
      ownerId: userId,
      isPersonal: false,
      createdAt: now,
    });

    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId,
      role: "owner",
      joinedAt: now,
    });

    const workspace = await ctx.db.get(workspaceId);
    return workspace!;
  },
});

/**
 * Gets a workspace by ID, validating that the caller is a member.
 */
export const getWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const { membership, workspace } = await assertWorkspaceMember(
      ctx,
      workspaceId
    );
    return {
      ...workspace,
      role: membership.role,
    };
  },
});

/**
 * Gets a workspace by slug, validating that the caller is a member.
 */
export const getWorkspaceBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const { membership, workspace } = await assertWorkspaceMemberBySlug(
      ctx,
      slug
    );
    return {
      ...workspace,
      role: membership.role,
    };
  },
});

/**
 * Lists all workspaces that the current user belongs to.
 */
export const getUserWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);

    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const workspacesWithRoles = await Promise.all(
      memberships.map(async (m) => {
        const ws = await ctx.db.get(m.workspaceId);
        if (!ws) return null;
        return {
          ...ws,
          role: m.role,
          joinedAt: m.joinedAt,
        };
      })
    );

    return workspacesWithRoles.filter(
      (ws): ws is NonNullable<typeof ws> => ws !== null
    );
  },
});

/**
 * Gets the current user's personal workspace, or null if none.
 */
export const getPersonalWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);

    const personal = await ctx.db
      .query("workspaces")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .filter((q) => q.eq(q.field("isPersonal"), true))
      .first();

    return personal;
  },
});

/**
 * Ensures the authenticated user has a personal workspace, creating one if needed.
 */
export const getOrCreatePersonalWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    return await ensurePersonalWorkspace(ctx, userId);
  },
});

/**
 * Lists members in a workspace.
 */
export const getWorkspaceMembers = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    await assertWorkspaceMember(ctx, workspaceId);

    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    const membersWithUsers = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        return {
          _id: member._id,
          userId: member.userId,
          role: member.role,
          joinedAt: member.joinedAt,
          name: user?.name,
          email: user?.email,
          image: user?.image,
        };
      })
    );

    return membersWithUsers;
  },
});
