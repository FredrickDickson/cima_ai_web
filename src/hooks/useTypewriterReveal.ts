import { useCallback, useEffect, useRef, useState } from "react";

export const TYPEWRITER_CHARS_PER_SECOND = 180;

// Caps how often a reveal tick is actually committed to React state (and
// thus re-parsed by ReactMarkdown / re-scrolled). The reveal position itself
// still advances every animation frame so pacing stays accurate — this only
// throttles how often that position is *emitted*. Without this, onTick fires
// on nearly every frame (~60/sec), and each of those re-renders can flip a
// still-growing raw Markdown string across a syntax boundary (e.g. a heading
// or table gaining its closing characters), snapping the DOM into a
// different shape dozens of times a second — that's what reads as jitter.
const MIN_EMIT_INTERVAL_MS = 80;

// Advances `from` toward `text.length` by `rawChars`, then snaps forward to
// the next whitespace so words aren't split mid-letter. The snap can reveal
// more than `rawChars` — callers must charge the overshoot back against
// their rate budget or the effective reveal speed runs faster than intended.
function nextRevealLen(text: string, from: number, rawChars: number): number {
  if (from >= text.length) return from;
  let to = Math.min(from + rawChars, text.length);
  if (to < text.length) {
    while (to < text.length && !/\s/.test(text[to])) to++;
  }
  return to;
}

// Decouples visual reveal rate from how fast text actually arrives (network
// deltas for a true SSE stream, or the full string all at once for a
// single-shot response) — driven by requestAnimationFrame, calling onTick
// only when the revealed length actually advances.
export function useTypewriterReveal(
  onTick: (revealedText: string, done: boolean) => void,
  charsPerSecond: number = TYPEWRITER_CHARS_PER_SECOND,
) {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  const [revealing, setRevealing] = useState(false);
  const targetRef = useRef("");
  const streamEndedRef = useRef(true);
  const revealedLenRef = useRef(0);
  const carryRef = useRef(0);
  const lastTsRef = useRef(0);
  const lastEmitTsRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const tokenRef = useRef(0);

  const stop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const tick = useCallback((token: number, now: number) => {
    if (token !== tokenRef.current) return; // superseded — drop this frame
    const target = targetRef.current;
    const elapsedMs = lastTsRef.current ? now - lastTsRef.current : 0;
    lastTsRef.current = now;
    const budget = carryRef.current + (elapsedMs / 1000) * charsPerSecond;
    const rawChars = Math.max(0, Math.floor(budget));

    const from = revealedLenRef.current;
    const to = nextRevealLen(target, from, rawChars);
    // Charge any whitespace-snap overshoot back against the budget so the
    // long-run average reveal rate still matches charsPerSecond.
    carryRef.current = budget - (to - from);
    revealedLenRef.current = to;
    const caughtUp = to >= target.length;
    const done = caughtUp && streamEndedRef.current;

    // Always emit on done/caughtUp so the visible text never lags behind the
    // internally-tracked position once the loop finishes or parks — only the
    // in-between frames get throttled.
    const shouldEmit = to !== from
      && (done || caughtUp || now - lastEmitTsRef.current >= MIN_EMIT_INTERVAL_MS);

    if (shouldEmit) {
      lastEmitTsRef.current = now;
      onTickRef.current(target.slice(0, to), done);
    }

    if (done) {
      setRevealing(false);
      frameRef.current = null;
      return;
    }
    if (caughtUp) {
      // Nothing left to reveal right now — park the loop. grow()/finish()
      // will resume it once there's more text or the stream ends.
      frameRef.current = null;
      return;
    }
    frameRef.current = requestAnimationFrame((t) => tick(token, t));
  }, [charsPerSecond]);

  const resume = useCallback(() => {
    if (frameRef.current !== null) return;
    const token = tokenRef.current;
    lastTsRef.current = 0;
    frameRef.current = requestAnimationFrame((t) => tick(token, t));
  }, [tick]);

  // Starts a brand-new reveal session, superseding any in-flight one.
  // streamEnded: false for a true SSE stream (call grow()/finish() as
  // deltas arrive); true (default) when the full text is already known.
  const reveal = useCallback((fullText: string, opts?: { streamEnded?: boolean }) => {
    tokenRef.current += 1;
    stop();
    targetRef.current = fullText;
    streamEndedRef.current = opts?.streamEnded ?? true;
    revealedLenRef.current = 0;
    carryRef.current = 0;
    lastTsRef.current = 0;
    lastEmitTsRef.current = 0;
    setRevealing(true);
    resume();
  }, [resume, stop]);

  // Extends the target text of the *current* reveal session (streaming only).
  const grow = useCallback((fullTextSoFar: string) => {
    targetRef.current = fullTextSoFar;
    setRevealing(true);
    resume();
  }, [resume]);

  // Marks that no more text will arrive; the loop finishes once it catches up.
  const finish = useCallback(() => {
    streamEndedRef.current = true;
    resume();
  }, [resume]);

  // Immediately snaps to the final target text and stops — used when a new
  // message/request supersedes one that's still mid-reveal.
  const complete = useCallback(() => {
    tokenRef.current += 1;
    stop();
    revealedLenRef.current = targetRef.current.length;
    setRevealing(false);
    onTickRef.current(targetRef.current, true);
  }, [stop]);

  // Stops without a final emit — true cancellation (unmount, or a path —
  // like an error message — that intentionally bypasses the reveal).
  const cancel = useCallback(() => {
    tokenRef.current += 1;
    stop();
    setRevealing(false);
  }, [stop]);

  useEffect(() => () => {
    tokenRef.current += 1;
    stop();
  }, [stop]);

  return { revealing, reveal, grow, finish, complete, cancel };
}
