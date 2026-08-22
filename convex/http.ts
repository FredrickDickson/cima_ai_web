import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { requireIngestSecret } from "./lib/ingestAuth";

const http = httpRouter();

function requireSecretFromBody(b: Record<string, unknown> | null): string | Response {
  if (!b || typeof b.secret !== "string") {
    return Response.json({ error: "`secret` (string) is required" }, { status: 400 });
  }
  try {
    requireIngestSecret(b.secret);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return b.secret;
}

// Called from a new Supabase edge function (get-large-document-upload-url)
// that verifies Supabase auth first — this route itself only checks the
// shared ingest secret (server-to-server trust), the same model as every
// other ingestion-facing Convex function in this codebase.
http.route({
  path: "/generateLargeDocumentUploadUrl",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const secretOrResponse = requireSecretFromBody(body);
    if (secretOrResponse instanceof Response) return secretOrResponse;

    const uploadUrl = await ctx.storage.generateUploadUrl();
    return Response.json({ uploadUrl });
  }),
});

// Called from create-large-document (verifies Supabase auth, passes the
// verified user id as `ownerId` — never trusted from the browser directly).
// Creates the document row and kicks off ingestion.
http.route({
  path: "/createLargeDocument",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const secretOrResponse = requireSecretFromBody(body);
    if (secretOrResponse instanceof Response) return secretOrResponse;
    const secret = secretOrResponse;
    const b = body as Record<string, unknown>;

    if (typeof b.ownerId !== "string" || typeof b.name !== "string" || typeof b.storageId !== "string") {
      return Response.json({ error: "`ownerId`, `name`, and `storageId` (strings) are required" }, { status: 400 });
    }

    const docId = await ctx.runMutation(api.largeDocuments.create, {
      secret,
      ownerId: b.ownerId,
      name: b.name,
      storageId: b.storageId as any,
    });
    await ctx.scheduler.runAfter(0, internal.largeDocumentIngestion.startSharding, { docId });

    return Response.json({ docId });
  }),
});

// Called from supabase/functions/_shared/tagged-authorities.ts when a tagged
// doc_id isn't found in Supabase's `documents` table — checks whether it's a
// Convex-hosted large document instead. Secret-gated: unlike /searchLibrary,
// this searches user-uploaded content, not the public legal-library corpus.
http.route({
  path: "/searchLargeDocument",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const secretOrResponse = requireSecretFromBody(body);
    if (secretOrResponse instanceof Response) return secretOrResponse;
    const b = body as Record<string, unknown>;

    if (typeof b.docId !== "string" || typeof b.query !== "string") {
      return Response.json({ error: "`docId` and `query` (strings) are required" }, { status: 400 });
    }
    const matchCount = typeof b.matchCount === "number" ? b.matchCount : 6;

    const doc = await ctx.runQuery(api.largeDocuments.get, { docId: b.docId as any });
    if (!doc) {
      return Response.json({ found: false });
    }

    const chunks = await ctx.runQuery(internal.documentChunks.fullTextSearch, {
      docId: b.docId as any,
      searchQuery: b.query,
      matchCount,
    });

    return Response.json({
      found: true,
      name: doc.name,
      status: doc.status,
      chunks: chunks.map((c) => ({
        content: c.content,
        pageStart: c.pageStart,
        pageEnd: c.pageEnd,
      })),
    });
  }),
});

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
