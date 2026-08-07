import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { searchAuthorities, type AuthoritySearchResult } from "../lib/authoritySearch";
import { buildMentionMarker, detectMentionTrigger, type TaggedAuthority } from "../lib/mentions";

export interface UseAuthorityMentionsArgs {
  text: string;
  setText: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
  userId: string | undefined;
}

const DEBOUNCE_MS = 200;

/**
 * Shared "@ mention" authority-tagging behavior for a plain controlled
 * <textarea>. Detects an "@" trigger as the user types, searches Legal
 * Library cases/legislation + the user's own documents, and on selection
 * splices a literal `@[Title]` marker into the text while tracking the
 * underlying {id, type} in parallel state. See src/lib/mentions.ts for the
 * marker/reconciliation design.
 */
export function useAuthorityMentions({ text, setText, textareaRef, userId }: UseAuthorityMentionsArgs) {
  const [taggedAuthorities, setTaggedAuthorities] = useState<TaggedAuthority[]>([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupQuery, setPopupQuery] = useState("");
  const [popupResults, setPopupResults] = useState<AuthoritySearchResult[]>([]);
  const [popupLoading, setPopupLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [triggerStart, setTriggerStart] = useState<number | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  // Authorities still referenced in the text right now (deleting the marker
  // text drops the tag with no extra reconciliation step needed).
  const activeTaggedAuthorities = useMemo(
    () => taggedAuthorities.filter((t) => text.includes(t.marker)),
    [taggedAuthorities, text],
  );

  useEffect(() => {
    if (!popupOpen || !popupQuery.trim()) {
      setPopupResults([]);
      setPopupLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const requestId = ++requestIdRef.current;
    setPopupLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchAuthorities(popupQuery, userId);
      if (requestIdRef.current !== requestId) return;
      setPopupResults(results);
      setActiveIndex(0);
      setPopupLoading(false);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [popupQuery, popupOpen, userId]);

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    const caret = e.target.selectionStart ?? value.length;
    setText(value);

    const trigger = detectMentionTrigger(value, caret);
    if (trigger) {
      setTriggerStart(trigger.start);
      setPopupQuery(trigger.query);
      setPopupOpen(true);
    } else {
      setPopupOpen(false);
      setTriggerStart(null);
    }
  }

  function selectSuggestion(result: AuthoritySearchResult) {
    if (triggerStart === null) return;
    const existingMarkers = taggedAuthorities.map((t) => t.marker);
    const marker = buildMentionMarker(result.label, result.citation, existingMarkers);
    const end = triggerStart + 1 + popupQuery.length;
    const next = `${text.slice(0, triggerStart)}${marker} ${text.slice(end)}`;

    setText(next);
    setTaggedAuthorities((prev) => [
      ...prev,
      { id: result.id, type: result.type, label: result.label, citation: result.citation, marker },
    ]);
    setPopupOpen(false);
    setPopupQuery("");
    const newCaret = triggerStart + marker.length + 1;
    setTriggerStart(null);

    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(newCaret, newCaret);
      }
    });
  }

  /** Seeds tags restored from a saved session/draft (e.g. on session reload) without duplicating already-active ones. */
  function hydrateTags(tags: TaggedAuthority[]) {
    setTaggedAuthorities((prev) => {
      const merged = [...prev];
      for (const t of tags) {
        if (!merged.some((m) => m.marker === t.marker)) merged.push(t);
      }
      return merged;
    });
  }

  function removeTag(id: string) {
    const toRemove = taggedAuthorities.filter((t) => t.id === id);
    if (toRemove.length === 0) return;
    let next = text;
    for (const t of toRemove) {
      next = next.split(t.marker).join("").replace(/ {2,}/g, " ");
    }
    setText(next);
    setTaggedAuthorities((prev) => prev.filter((t) => t.id !== id));
  }

  /** Returns true when the keypress was consumed for popup navigation. */
  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): boolean {
    if (!popupOpen || popupResults.length === 0) return false;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % popupResults.length);
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + popupResults.length) % popupResults.length);
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      selectSuggestion(popupResults[activeIndex]);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setPopupOpen(false);
      setTriggerStart(null);
      return true;
    }
    return false;
  }

  return {
    activeTaggedAuthorities,
    popupOpen,
    popupQuery,
    popupResults,
    popupLoading,
    activeIndex,
    setActiveIndex,
    handleTextareaChange,
    handleTextareaKeyDown,
    selectSuggestion,
    removeTag,
    hydrateTags,
  };
}

export type UseAuthorityMentionsResult = ReturnType<typeof useAuthorityMentions>;
