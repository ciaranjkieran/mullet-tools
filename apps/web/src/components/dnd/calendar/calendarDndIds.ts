// src/dnd/calendarIds.ts
export type EntityType = "task" | "milestone" | "project" | "goal";

export const listId = (t: EntityType, modeId: number, dateStr: string) =>
  `list:${t}:${modeId}:${dateStr}`;
export const modeBand = (modeId: number, dateStr: string) =>
  `mode:${modeId}:${dateStr}`;
export const dateId = (dateStr: string) => `date:${dateStr}`;

export type TargetScope =
  | { kind: "list"; entityType: EntityType; modeId: number; dateStr: string }
  | { kind: "mode"; modeId: number; dateStr: string }
  | { kind: "date"; dateStr: string };

export function parseDroppableId(id: string): TargetScope | null {
  if (id.startsWith("list:")) {
    const [, t, m, d] = id.split(":");
    return {
      kind: "list",
      entityType: t as EntityType,
      modeId: Number(m),
      dateStr: d,
    };
  }
  if (id.startsWith("mode:")) {
    const [, m, d] = id.split(":");
    return { kind: "mode", modeId: Number(m), dateStr: d };
  }
  if (id.startsWith("date:")) {
    const [, d] = id.split(":");
    return { kind: "date", dateStr: d };
  }
  return null;
}

export type DragMeta = {
  entityType: EntityType; // "task" for now
  id: number;
  modeId: number;
  dateStr: string | null | undefined; // should be normalized yyyy-MM-dd for calendar items
  title?: string;
};
