import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireIngestSecret } from "./lib/ingestAuth";

// User-owned files (document uploads, contract uploads, avatars, admin
// uploads) — the Convex replacement for the Supabase storage buckets. The
// caller's identity comes from their Supabase session (see auth.config.ts);
// the owner is never taken from an argument.

const kindValidator = v.union(v.literal("document"), v.literal("contract"), v.literal("avatar"), v.literal("admin"));

// Supabase auth.users.id of the caller. auth.config.ts has a single provider
// (this project's Supabase), so `subject` alone identifies the user — and it
// matches the user_id columns in Supabase, which the storage backfill relies on.
async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("You need to be signed in to manage files");
  return identity.subject;
}

async function requireOwnedFile(ctx: QueryCtx | MutationCtx, userId: string, storageId: Id<"_storage">) {
  const file = await ctx.db
    .query("userFiles")
    .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
    .unique();
  if (!file || file.ownerId !== userId) throw new Error("File not found");
  return file;
}

async function recordFile(
  ctx: MutationCtx,
  args: { ownerId: string; storageId: Id<"_storage">; name: string; kind: "document" | "contract" | "avatar" | "admin" },
) {
  const meta = await ctx.db.system.get("_storage", args.storageId);
  if (!meta) throw new Error("Upload not found");
  const existing = await ctx.db
    .query("userFiles")
    .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
    .unique();
  if (existing && existing.ownerId !== args.ownerId) throw new Error("File not found");
  if (!existing) {
    await ctx.db.insert("userFiles", {
      ownerId: args.ownerId,
      storageId: args.storageId,
      name: args.name,
      contentType: meta.contentType,
      size: meta.size,
      kind: args.kind,
      createdAt: Date.now(),
    });
  }
  return await ctx.storage.getUrl(args.storageId);
}

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Claims an uploaded file for the caller. Returns its URL (long-lived — used
// as-is for avatars, which are shown publicly across the app).
export const save = mutation({
  args: { storageId: v.id("_storage"), name: v.string(), kind: kindValidator },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);
    return await recordFile(ctx, { ownerId, ...args });
  },
});

export const getUrl = query({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireOwnedFile(ctx, userId, args.storageId);
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const remove = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const file = await requireOwnedFile(ctx, userId, args.storageId);
    await ctx.storage.delete(args.storageId);
    await ctx.db.delete(file._id);
    return null;
  },
});

// Backfill only (scripts/migrate-storage-to-convex.mjs): records a file copied
// from a Supabase bucket under the owner the Supabase row already names.
// Secret-gated server-to-server call, like the library ingestion functions.
export const importFile = mutation({
  args: {
    secret: v.string(),
    ownerId: v.string(),
    storageId: v.id("_storage"),
    name: v.string(),
    kind: kindValidator,
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    requireIngestSecret(args.secret);
    const { secret: _secret, ...file } = args;
    return await recordFile(ctx, file);
  },
});
