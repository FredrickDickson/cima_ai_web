import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Called from supabase/functions/_shared/legal-retrieval.ts's
// searchLegalLibrary() (server-to-server from the Supabase legal-search edge
// function) — merges into the existing Supabase RPC results there. Public per
// the architecture decision that library reads are effectively public
// (matches the existing Supabase RLS policy's actual sensitivity level).
http.route({
  path: "/searchLibrary",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body: unknown = await req.json().catch(() => null);
    if (typeof body !== "object" || body === null) {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    if (typeof b.query !== "string") {
      return Response.json({ error: "`query` (string) is required" }, { status: 400 });
    }

    const query = b.query;
    const embedding = Array.isArray(b.embedding) ? (b.embedding as number[]) : undefined;
    const jurisdiction = typeof b.jurisdiction === "string" ? b.jurisdiction : undefined;
    const sourceType = typeof b.sourceType === "string" ? b.sourceType : undefined;
    const matchCount = typeof b.matchCount === "number" ? b.matchCount : 6;

    let hits: Array<{
      _id: string;
      docId: string;
      title: string;
      citation?: string;
      sourceType: string;
      jurisdiction: string;
      content: string;
      similarity?: number;
    }> = [];

    if (embedding) {
      hits = await ctx.runAction(internal.libraryChunks.vectorSearch, {
        embedding,
        matchCount,
        jurisdiction,
        sourceType,
      });
    }
    if (hits.length === 0) {
      hits = await ctx.runQuery(internal.libraryChunks.fullTextSearch, {
        searchQuery: query,
        jurisdiction,
        sourceType,
        matchCount,
      });
    }

    // Field names match RetrievedLibrarySource in
    // supabase/functions/_shared/legal-retrieval.ts exactly, so the Deno side
    // needs no translation layer.
    return Response.json(
      hits.map((h) => ({
        id: h._id,
        source_name: h.title,
        citation: h.citation,
        source_type: h.sourceType,
        jurisdiction: h.jurisdiction,
        content: h.content,
        similarity: h.similarity,
        doc_id: h.docId,
      })),
    );
  }),
});

export default http;
