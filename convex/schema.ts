import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  subscriptions: defineTable({
    userId: v.id("users"),
    polarCustomerId: v.string(),
    polarSubscriptionId: v.string(),
    productId: v.optional(v.string()),
    priceId: v.optional(v.string()),
    status: v.string(),
    currentPeriodEnd: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    cancelAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    seats: v.optional(v.number()),
    metadata: v.optional(v.any()),
    creditsBalance: v.number(),
    creditsGrantPerPeriod: v.number(),
    creditsRolloverLimit: v.number(),
    lastGrantCursor: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_polarSubscriptionId", ["polarSubscriptionId"])
    .index("by_status", ["status"]),

  credits_ledger: defineTable({
    userId: v.id("users"),
    subscriptionId: v.id("subscriptions"),
    amount: v.number(),
    type: v.string(),
    reason: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    meta: v.optional(v.any()),
  })
    .index('by_subscriptionId', ['subscriptionId'])
    .index('by_userId', ['userId'])
    .index('by_idempotencyKey', ['idempotencyKey']),

  // Workspaces
  workspaces: defineTable({
    name: v.string(),
    slug: v.string(),
    ownerId: v.id("users"),
    isPersonal: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_ownerId", ["ownerId"]),

  // Workspace membership join table
  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    joinedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspaceId_and_userId", ["workspaceId", "userId"]),

  // Folders within workspaces
  folders: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    createdBy: v.id("users"),
    visibility: v.union(v.literal("workspace"), v.literal("private")),
    color: v.optional(v.string()),
    emoji: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspaceId_and_createdBy", ["workspaceId", "createdBy"]),

  projects: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    visibility: v.optional(v.union(v.literal("workspace"), v.literal("private"))),
    createdBy: v.optional(v.id("users")),
    folderId: v.optional(v.id("folders")),
    name: v.string(),
    description: v.optional(v.string()),
    prompt: v.optional(v.string()),
    styleGuides: v.optional(v.string()),
    sketchesData: v.any(),
    viewportData: v.optional(v.any()),
    generatedDesignData: v.optional(v.any()),
    thumbnail: v.optional(v.string()),
    thumbnailStorageId: v.optional(v.id("_storage")),
    lastEditedBy: v.optional(v.id("users")),
    moodBoardImages: v.optional(v.array(v.string())),
    inspirationImages: v.optional(v.array(v.string())),
    referenceUrls: v.optional(v.array(v.string())),
    lastModified: v.number(),
    createdAt: v.number(),
    isPublic: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    projectNumber: v.number(),
    isPinned: v.optional(v.boolean()),
    is_deleted: v.optional(v.boolean()),
    deleted_at: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_lastModified", ["userId", "lastModified"])
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspaceId_and_lastModified", ["workspaceId", "lastModified"])
    .index("by_folderId", ["folderId"]),

  project_counters: defineTable({
    userId: v.id("users"),
    nextProjectNumber: v.number(),
  }).index("by_userId", ["userId"]),

  chats: defineTable({
    projectId: v.string(),
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_updatedAt", ["projectId", "updatedAt"]),

  chatTurns: defineTable({
    projectId: v.string(),
    chatId: v.optional(v.string()),
    turnId: v.string(),
    prompt: v.string(),
    response: v.string(),
    timestamp: v.number(),
    urls: v.optional(v.array(v.string())),
    imageStorageIds: v.optional(v.array(v.string())),
  })
    .index('by_project', ['projectId'])
    .index('by_chat', ['chatId']),

  generatedui_snapshots: defineTable({
    projectId: v.string(),
    shapeId: v.string(),
    thumbnailUrl: v.string(),
    storageId: v.string(),  // so you can delete the old file
  }).index('by_shapeId', ['shapeId']),
});

export default schema;