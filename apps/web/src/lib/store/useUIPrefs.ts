"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Key types */
export type PastDueKey = "calendar:pastDue" | `calendar:pastDue:${string}`;
export type LookingAheadKey =
  | "calendar:lookingAhead"
  | `calendar:lookingAhead:${string}`;
export type SectionKey = PastDueKey | LookingAheadKey;

/** Key builders with precise return types (overloads) */
export function pastDueKey(): PastDueKey;
export function pastDueKey(scope: string): PastDueKey;
export function pastDueKey(scope?: string): PastDueKey {
  return (
    scope ? `calendar:pastDue:${scope}` : "calendar:pastDue"
  ) as PastDueKey;
}

export function lookingAheadKey(): LookingAheadKey;
export function lookingAheadKey(scope: string): LookingAheadKey;
export function lookingAheadKey(scope?: string): LookingAheadKey {
  return (
    scope ? `calendar:lookingAhead:${scope}` : "calendar:lookingAhead"
  ) as LookingAheadKey;
}

type UIPrefsState = {
  sections: Partial<Record<SectionKey, boolean>>;
  setSectionOpen: (key: SectionKey, open: boolean) => void;
  toggleSection: (key: SectionKey, defaultOpen?: boolean) => void;
  isSectionOpen: (key: SectionKey, defaultOpen?: boolean) => boolean;
};

export const useUIPrefs = create<UIPrefsState>()(
  persist(
    (set, get) => ({
      sections: {},
      setSectionOpen: (key, open) =>
        set((s) => ({ sections: { ...s.sections, [key]: open } })),
      toggleSection: (key, defaultOpen = false) => {
        const current = get().isSectionOpen(key, defaultOpen);
        set((s) => ({ sections: { ...s.sections, [key]: !current } }));
      },
      isSectionOpen: (key, defaultOpen = false) => {
        const val = get().sections[key];
        return typeof val === "boolean" ? val : defaultOpen;
      },
    }),
    { name: "mullet-ui-prefs" }
  )
);

/** Convenience hook */
export function useSectionOpen(key: SectionKey, defaultOpen: boolean) {
  const isOpen = useUIPrefs((s) => s.isSectionOpen(key, defaultOpen));
  const setOpen = (open: boolean) =>
    useUIPrefs.getState().setSectionOpen(key, open);
  const toggle = () => useUIPrefs.getState().toggleSection(key, defaultOpen);
  return { isOpen, setOpen, toggle };
}
