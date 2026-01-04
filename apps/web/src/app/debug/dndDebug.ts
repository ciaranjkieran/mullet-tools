// src/debug/dndDebug.ts
export const DND_DEBUG = true; // flip off when done

export const dndLog = (...a: any[]) => {
  if (!DND_DEBUG) return;
  // eslint-disable-next-line no-console
  console.debug("%c[DND]", "color:#0aa;font-weight:bold", ...a);
};

export const dndGroup = (label: string) => {
  if (!DND_DEBUG) return;
  // eslint-disable-next-line no-console
  console.groupCollapsed("%c[DND] " + label, "color:#0aa");
};

export const dndGroupEnd = () => {
  if (!DND_DEBUG) return;
  // eslint-disable-next-line no-console
  console.groupEnd();
};

export const dndTable = (rows: any) => {
  if (!DND_DEBUG) return;
  // eslint-disable-next-line no-console
  console.table?.(rows);
};
