import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
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

// ─── Legal-library reads for Supabase edge functions ───────────────────────
// (case-brief, case-citator, legislation-currency-check, tagged-authorities —
// see supabase/functions/_shared/convex-library.ts). Public like /searchLibrary:
// library reads are effectively public. Ids may be Convex ids or pre-migration
// Supabase UUIDs; responses use the snake_case shape the edge functions used
// to get from legal_library_documents.

function toSnakeDoc(d: Doc<"libraryDocuments">) {
  return {
    id: d._id,
    title: d.title,
    source_type: d.sourceType,
    jurisdiction: d.jurisdiction,
    citation: d.citation ?? "",
    court: d.court ?? "",
    decided_year: d.decidedYear ?? null,
    parties: d.parties,
    legislation_number: d.legislationNumber ?? "",
  };
}

async function readJsonObject(req: Request): Promise<Record<string, unknown> | Response> {
  const body: unknown = await req.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  return body as Record<string, unknown>;
}

// One doc + its ordered chunks (capped by getWithChunks — `truncated` says so).
http.route({
  path: "/getLibraryDocument",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const b = await readJsonObject(req);
    if (b instanceof Response) return b;
    if (typeof b.id !== "string") {
      return Response.json({ error: "`id` (string) is required" }, { status: 400 });
    }
    const [doc] = await ctx.runQuery(internal.libraryDocuments.resolveMany, { ids: [b.id] });
    if (!doc) return Response.json({ found: false });
    const result = await ctx.runQuery(api.libraryDocuments.getWithChunks, { docId: doc._id });
    if (!result) return Response.json({ found: false });
    return Response.json({
      found: true,
      document: toSnakeDoc(result.document),
      chunks: result.chunks.map((c) => ({ id: c._id, chunk_index: c.chunkIndex, content: c.content })),
      truncated: result.truncated,
    });
  }),
});

// Metadata for several docs (input order preserved, unknown ids dropped).
http.route({
  path: "/getLibraryDocuments",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const b = await readJsonObject(req);
    if (b instanceof Response) return b;
    if (!Array.isArray(b.ids) || !b.ids.every((id) => typeof id === "string")) {
      return Response.json({ error: "`ids` (string[]) is required" }, { status: 400 });
    }
    const docs = await ctx.runQuery(internal.libraryDocuments.resolveMany, { ids: b.ids as string[] });
    return Response.json(docs.map(toSnakeDoc));
  }),
});

// Completed-doc count, optionally for one sourceType (the citator's corpus size).
http.route({
  path: "/libraryDocumentCount",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const b = await readJsonObject(req);
    if (b instanceof Response) return b;
    const sourceType = typeof b.sourceType === "string" ? b.sourceType : undefined;
    const counts = await ctx.runQuery(api.libraryDocuments.jurisdictionCounts, { sourceType });
    return Response.json({ count: counts.reduce((n, c) => n + c.count, 0) });
  }),
});

export default http;
