import { convex } from "./convexClient";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// File storage lives in Convex (convex/userFiles.ts). The caller is identified
// by their Supabase session, which <ConvexProviderWithAuth> passes to Convex
// (src/lib/convexAuth.ts) — so these helpers need no token handling.
//
// Supabase rows point at a Convex file with a "convex:<storageId>.<ext>"
// reference — the extension keeps existing `.split(".").pop()` file-type
// checks (e.g. Documents.tsx's viewer) working unchanged.

export type UserFileKind = "document" | "contract" | "avatar" | "admin";

const PREFIX = "convex:";

export function isConvexFileRef(ref: string | null | undefined): ref is `convex:${string}` {
  return !!ref && ref.startsWith(PREFIX);
}

function storageIdFromRef(ref: string): Id<"_storage"> {
  const rest = ref.slice(PREFIX.length);
  const dot = rest.indexOf(".");
  return (dot === -1 ? rest : rest.slice(0, dot)) as Id<"_storage">;
}

/** Uploads a file to Convex storage and records the caller as its owner. */
export async function uploadUserFile(file: File, kind: UserFileKind): Promise<{ ref: string; url: string | null }> {
  const uploadUrl = await convex.mutation(api.userFiles.generateUploadUrl, {});
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
  const url = await convex.mutation(api.userFiles.save, { storageId, name: file.name, kind });
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "bin";
  return { ref: `${PREFIX}${storageId}.${ext}`, url };
}

/** A URL for one of the caller's own files. */
export async function getUserFileUrl(ref: string): Promise<string | null> {
  return await convex.query(api.userFiles.getUrl, { storageId: storageIdFromRef(ref) });
}

export async function deleteUserFile(ref: string): Promise<void> {
  await convex.mutation(api.userFiles.remove, { storageId: storageIdFromRef(ref) });
}
