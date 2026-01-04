// src/dnd/grouping.ts
import { Task } from "@shared/types/Task";

export type Container =
  | { kind: "milestone"; id: number }
  | { kind: "project"; id: number }
  | { kind: "goal"; id: number }
  | { kind: "mode"; id: number }; // "none" parent, lives directly under mode

export function containerForTask(t: Task): Container {
  if (t.milestoneId) return { kind: "milestone", id: t.milestoneId };
  if (t.projectId) return { kind: "project", id: t.projectId };
  if (t.goalId) return { kind: "goal", id: t.goalId };
  return { kind: "mode", id: t.modeId };
}

export function sameContainer(a: Container, b: Container): boolean {
  return a.kind === b.kind && a.id === b.id;
}
