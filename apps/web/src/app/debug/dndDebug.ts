// src/app/debug/dndDebug.ts

export const DND_DEBUG = true; // flip off when done

// Use `unknown` instead of `any` for safety + lint happiness.
// Console accepts `unknown[]` just fine.
export const dndLog = (...args: unknown[]) => {
  if (!DND_DEBUG) return;
  console.debug("%c[DND]", "color:#0aa;font-weight:bold", ...args);
};

export const dndGroup = (label: string) => {
  if (!DND_DEBUG) return;
  console.groupCollapsed("%c[DND] " + label, "color:#0aa");
};

export const dndGroupEnd = () => {
  if (!DND_DEBUG) return;
  console.groupEnd();
};

// If you mostly pass arrays/objects into console.table, this is a good, flexible type.
export type DndTableRows =
  | readonly Record<string, unknown>[]
  | Record<string, unknown>;

export const dndTable = (rows: DndTableRows) => {
  if (!DND_DEBUG) return;
  console.table?.(rows);
};
