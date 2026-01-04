"use client";
import { useEffect, useRef } from "react";
import { useSelectionStore } from "../store/useSelectionStore";

type Options = {
  // Additional selectors that should *not* clear selection (e.g., modals)
  safeSelectors?: string[];
  // If true, ESC clears selection too
  enableEsc?: boolean;
};

/**
 * Mount once at view root (Dashboard/Calendar).
 * Clears selection when clicking outside cards/batch UI/popovers.
 */
export function useGlobalOutsideDeselect(options: Options = {}) {
  const clearAll = useSelectionStore((s) => s.clearAll);
  const installed = useRef(false);

  useEffect(() => {
    if (installed.current) return;
    installed.current = true;

    const safeBaseSelectors = [
      '[data-entity-card="true"]',
      '[data-batch-ui="true"]',
      '[data-popover="true"]',
    ];
    const safeSelectors = options.safeSelectors
      ? safeBaseSelectors.concat(options.safeSelectors)
      : safeBaseSelectors;

    const isInsideSafe = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      return safeSelectors.some((sel) => el.closest(sel));
    };

    // Use pointerdown so we clear before focus/active styles
    const onPointerDown = (e: PointerEvent) => {
      if (!isInsideSafe(e.target)) {
        clearAll();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (options.enableEsc && e.key === "Escape") {
        clearAll();
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    if (options.enableEsc)
      document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      if (options.enableEsc)
        document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [clearAll, options.enableEsc, options.safeSelectors]);
}
