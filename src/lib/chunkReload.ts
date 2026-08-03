const CHUNK_RELOAD_KEY = "cima-chunk-reload-attempted";

/** Matches the cross-browser phrasing of a stale/missing JS chunk failure. */
export function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    /dynamically imported module/i.test(msg) ||
    /importing a module script failed/i.test(msg) ||
    /loading chunk [\d]+ failed/i.test(msg)
  );
}

/** Reloads once per session to pick up a new deploy's chunk hashes. Returns
 *  true if it triggered a reload, false if this session already tried once
 *  (avoids an infinite reload loop if the deploy is genuinely broken/offline). */
export function attemptChunkReload(): boolean {
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
  return true;
}

/** Call once the app has mounted successfully — clears the guard so a
 *  future stale-chunk error (next deploy) gets a fresh reload attempt. */
export function clearChunkReloadGuard(): void {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
}

export function wasChunkReloadJustAttempted(): boolean {
  return sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1";
}
