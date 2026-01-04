// lib/ui/useCollapsed.ts
"use client";
import { useEntityUIStore } from "@/lib/store/useEntityUIStore";
import type { CollapsibleKind } from "@/lib/store/useEntityUIStore";

export function useCollapsed(kind: CollapsibleKind, id: number) {
  const collapsed = useEntityUIStore((s) => !!s.collapsed[kind]?.[id]);
  const toggle = () => useEntityUIStore.getState().toggleCollapsed(kind, id);
  const set = (v: boolean) =>
    useEntityUIStore.getState().setCollapsed(kind, id, v);
  return { collapsed, toggle, set };
}
