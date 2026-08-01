import { useEffect } from "react";

/** Sets the browser-tab title for the duration this component is mounted, restoring the previous title on unmount. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
