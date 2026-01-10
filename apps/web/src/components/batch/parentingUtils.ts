import { EntityKind, ParentType } from "@shared/api/batch/types/types";
import type { Milestone } from "@shared/types/Milestone";
import type { Project } from "@shared/types/Project";
import type { Goal } from "@shared/types/Goal";

/* ---------------- Configurable limits ---------------- */
const MILESTONE_MAX_DEPTH = 3;
const PROJECT_MAX_DEPTH = 3;

/* ---------------- Types ---------------- */
type ParentOption = { id: number; type: ParentType; title: string };

type SelectedMap = {
  task: Set<number>;
  milestone: Set<number>;
  project: Set<number>;
  goal: Set<number>;
};

type ById<T extends { id: number }> = Record<number, T>;

/* ---------------- Utility helpers ---------------- */
function indexById<T extends { id: number }>(arr: T[]): ById<T> {
  const out: ById<T> = {};
  for (const item of arr) out[item.id] = item;
  return out;
}

function depthOfMilestone(id: number, milestonesById: ById<Milestone>): number {
  let d = 1;
  let cur = milestonesById[id];
  while (cur?.parentId) {
    d++;
    cur = milestonesById[cur.parentId];
  }
  return d;
}

function depthOfProject(id: number, projectsById: ById<Project>): number {
  let d = 1;
  let cur = projectsById[id];
  while (cur?.parentId) {
    d++;
    cur = projectsById[cur.parentId];
  }
  return d;
}

function isMilestoneDescendant(
  possibleAncestorId: number,
  candidateId: number,
  milestonesById: ById<Milestone>
): boolean {
  let cur = milestonesById[candidateId];
  while (cur?.parentId) {
    if (cur.parentId === possibleAncestorId) return true;
    cur = milestonesById[cur.parentId];
  }
  return false;
}

function isProjectDescendant(
  possibleAncestorId: number,
  candidateId: number,
  projectsById: ById<Project>
): boolean {
  let cur = projectsById[candidateId];
  while (cur?.parentId) {
    if (cur.parentId === possibleAncestorId) return true;
    cur = projectsById[cur.parentId];
  }
  return false;
}

/* Compatibility matrix */
function allowedParentTypesForKinds(kinds: EntityKind[]): ParentType[] | null {
  if (kinds.includes("goal")) return null;

  let allowed: Set<ParentType> = new Set(["milestone", "project", "goal"]);

  for (const k of kinds) {
    if (k === "task" || k === "milestone") {
      allowed = new Set(
        [...allowed].filter(
          (t) => t === "milestone" || t === "project" || t === "goal"
        )
      );
    } else if (k === "project") {
      allowed = new Set(
        [...allowed].filter((t) => t === "project" || t === "goal")
      );
    }
  }

  return [...allowed];
}

/* ======================================================== */
/* Main function: mode-filtered lists ONLY */
export function computeParentOptions({
  kinds,
  selected,
  sameMode,
  milestonesInMode,
  projectsInMode,
  goalsInMode,
}: {
  kinds: EntityKind[];
  selected: SelectedMap;
  sameMode: boolean;
  milestonesInMode: Milestone[];
  projectsInMode: Project[];
  goalsInMode: Goal[];
}): { parentOptions: ParentOption[]; groupingReason: string | null } {
  // 0) Must share a single mode
  if (!sameMode) {
    return {
      parentOptions: [],
      groupingReason: "Grouping requires all selected to share the same mode.",
    };
  }

  // 1) Determine compatible parent types
  const allowed = allowedParentTypesForKinds(kinds);
  if (!allowed || allowed.length === 0) {
    return {
      parentOptions: [],
      groupingReason: kinds.includes("goal")
        ? "Goals cannot be grouped under a parent."
        : "No compatible parent types for the current selection.",
    };
  }

  // 2) Build id indexes from *mode-filtered* lists
  const msById = indexById(milestonesInMode);
  const pjById = indexById(projectsInMode);

  const selMsIds = selected.milestone;
  const selPjIds = selected.project;
  const selGlIds = selected.goal;

  const candidates: ParentOption[] = [];

  // ---- Milestones as parents ----
  if (allowed.includes("milestone")) {
    for (const m of milestonesInMode) {
      if (selMsIds.has(m.id)) continue;

      // prevent putting a milestone under its own descendant (cycle)
      let unsafe = false;
      for (const mid of selMsIds) {
        if (isMilestoneDescendant(mid, m.id, msById)) {
          unsafe = true;
          break;
        }
      }
      if (unsafe) continue;

      const parentDepth = depthOfMilestone(m.id, msById);
      if (selMsIds.size > 0 && parentDepth + 1 > MILESTONE_MAX_DEPTH) continue;

      candidates.push({ id: m.id, type: "milestone", title: m.title });
    }
  }

  // ---- Projects as parents ----
  if (allowed.includes("project")) {
    for (const p of projectsInMode) {
      if (selPjIds.has(p.id)) continue;

      let unsafe = false;
      for (const pid of selPjIds) {
        if (isProjectDescendant(pid, p.id, pjById)) {
          unsafe = true;
          break;
        }
      }
      if (unsafe) continue;

      const parentDepth = depthOfProject(p.id, pjById);
      if (selPjIds.size > 0 && parentDepth + 1 > PROJECT_MAX_DEPTH) continue;

      candidates.push({ id: p.id, type: "project", title: p.title });
    }
  }

  // ---- Goals as parents ----
  if (allowed.includes("goal")) {
    for (const g of goalsInMode) {
      if (selGlIds.has(g.id)) continue;
      candidates.push({ id: g.id, type: "goal", title: g.title });
    }
  }

  if (candidates.length === 0) {
    return {
      parentOptions: [],
      groupingReason: "No eligible parents in this mode.",
    };
  }

  return { parentOptions: candidates, groupingReason: null };
}
