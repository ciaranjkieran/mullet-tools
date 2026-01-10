// utils/buildGoalTree.ts
import { Goal } from "@shared/types/Goal";

export function buildGoalTree(goals: Goal[], modeId: number): Goal[] {
  return goals
    .filter((g) => g.modeId === modeId)
    .sort((a, b) => a.position - b.position);
}
