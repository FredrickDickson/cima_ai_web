import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireIngestSecret } from "./lib/ingestAuth";

// Called by the ingestion script before uploading a document's bytes.
// Public + secret-gated for the same reason as the mutations in
// libraryDocuments.ts/libraryChunks.ts — see convex/lib/ingestAuth.ts.
export const generateUploadUrl = mutation({
  args: { secret: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    requireIngestSecret(args.secret);
    return await ctx.storage.generateUploadUrl();
  },
});
