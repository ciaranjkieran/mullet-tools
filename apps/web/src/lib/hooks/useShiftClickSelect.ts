"use client";

import { useCallback } from "react";
import {
  EntityType,
  useSelectionStore,
} from "../store/useSelectionStore";

/**
 * Queries the DOM for all visible entity cards (in render order)
 * and returns the items between `from` and `to` inclusive.
 */
function getVisibleEntityRange(
  from: { type: EntityType; id: number },
  to: { type: EntityType; id: number },
): Array<{ type: EntityType; id: number }> {
  const allCards = Array.from(
    document.querySelectorAll<HTMLElement>('[data-entity-card="true"]'),
  );

  const match = (el: HTMLElement, item: { type: string; id: number }) =>
    el.dataset.entityType === item.type &&
    el.dataset.entityId === String(item.id);

  const fromIdx = allCards.findIndex((el) => match(el, from));
  const toIdx = allCards.findIndex((el) => match(el, to));

  if (fromIdx === -1 || toIdx === -1) return [to]; // fallback: select just the target

  const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];

  return allCards.slice(start, end + 1).map((el) => ({
    type: el.dataset.entityType as EntityType,
    id: Number(el.dataset.entityId),
  }));
}

/**
 * Hook that enables shift+click (range select) and ctrl/cmd+click (toggle)
 * on an entity card.
 *
 * Returns `onClickCapture` — attach it to the card's outer div.
 * When a modifier key is held the capture-phase handler fires *before*
 * any child onClick (title → edit dialog, checkbox → complete, etc.),
 * preventing them from running.
 */
export function useShiftClickSelect(
  entityType: EntityType,
  entityId: number,
) {
  // Prevent browser text-selection on shift+mousedown (fires before click)
  const onMouseDownCapture = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        e.preventDefault();
      }
    },
    [],
  );

  const onClickCapture = useCallback(
    (e: React.MouseEvent) => {
      const isShift = e.shiftKey;
      const isMeta = e.metaKey || e.ctrlKey;

      if (!isShift && !isMeta) return; // normal click — let children handle it

      // Intercept: prevent child handlers (edit dialog, checkbox, etc.)
      e.stopPropagation();
      e.preventDefault();

      const store = useSelectionStore.getState();

      if (isShift) {
        // Shift+click → range select (or single if no anchor yet)
        if (store.lastSelected) {
          const range = getVisibleEntityRange(store.lastSelected, {
            type: entityType,
            id: entityId,
          });
          store.addMany(range);
        } else {
          store.add(entityType, entityId);
        }
        store.setLastSelected(entityType, entityId);
      } else {
        // Ctrl/Cmd+click → toggle individual
        store.toggle(entityType, entityId);
        store.setLastSelected(entityType, entityId);
      }
    },
    [entityType, entityId],
  );

  return { onClickCapture, onMouseDownCapture };
}
