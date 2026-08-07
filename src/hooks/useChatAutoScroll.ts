import { useEffect, useRef, type RefObject } from "react";

const NEAR_BOTTOM_PX = 120;

function isNearBottom(container: HTMLElement | null | undefined) {
  if (!container) return true;
  return container.scrollHeight - container.scrollTop - container.clientHeight < NEAR_BOTTOM_PX;
}

// `endRef` must be a sentinel div that is the last child of the scrollable
// message container. Smooth-scrolls once when `items` genuinely grows (a
// new message was appended); on subsequent content-only updates (a message
// still typing out via useTypewriterReveal) it only nudges the view with an
// instant, non-animated scroll, and only if the user is already near the
// bottom — this is what avoids stacking/interrupting animated scrolls on
// every reveal tick, which is what caused the mobile jitter.
export function useChatAutoScroll<T>(
  endRef: RefObject<HTMLDivElement>,
  items: T[],
  revealTick?: unknown,
) {
  const prevLenRef = useRef(items.length);

  useEffect(() => {
    const container = endRef.current?.parentElement;
    const grew = items.length > prevLenRef.current;
    prevLenRef.current = items.length;
    if (grew) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (isNearBottom(container)) {
      endRef.current?.scrollIntoView({ behavior: "auto" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, items, revealTick]);
}
