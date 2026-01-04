// Shared XOR helpers across entities
export type Ancestors = {
  goalId?: number | null;
  projectId?: number | null;
  milestoneId?: number | null;
  parentId?: number | null; // for project/milestone nesting
};

// Clear all but the "keep" key (used in form setters)
export function normalizeXor<T extends Ancestors>(
  obj: T,
  keep: keyof T,
  opts?: { onlyIfSet?: boolean } // default false
): T {
  const out = { ...obj };
  if (opts?.onlyIfSet && (out as any)[keep] == null) return out; // 👈 no-op when keep is null

  (["goalId", "projectId", "milestoneId", "parentId"] as (keyof T)[]).forEach(
    (k) => {
      if (k !== keep && k in out) (out as any)[k] = null;
    }
  );
  return out;
}

export function countSet(obj: Ancestors) {
  return (
    (obj.goalId != null ? 1 : 0) +
    (obj.projectId != null ? 1 : 0) +
    (obj.milestoneId != null ? 1 : 0) +
    (obj.parentId != null ? 1 : 0)
  );
}
// shared somewhere central, e.g. @shared/lineage/xor.ts
export function buildMilestonePayload(input: {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  modeId: number;
  parentId: number | null | undefined;
  projectId: number | null | undefined;
  goalId: number | null | undefined;
}) {
  const parentId = input.parentId ?? null;
  const projectId = parentId != null ? null : input.projectId ?? null;
  const goalId =
    parentId != null || projectId != null ? null : input.goalId ?? null;
  return { ...input, parentId, projectId, goalId };
}

// Equivalent payload helpers (copy pattern) for Task and Project:
export function buildTaskPayload(input: {
  title?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  modeId: number;
  milestoneId: number | null | undefined;
  projectId: number | null | undefined;
  goalId: number | null | undefined;
}) {
  const { milestoneId, projectId, goalId, ...rest } = input;
  const mId = milestoneId ?? null;
  const pId = mId != null ? null : projectId ?? null;
  const gId = mId != null || pId != null ? null : goalId ?? null;
  return { ...rest, milestoneId: mId, projectId: pId, goalId: gId };
}

export function buildProjectPayload(input: {
  title?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  modeId: number;
  parentId: number | null | undefined;
  goalId: number | null | undefined;
}) {
  const { parentId, goalId, ...rest } = input;
  const pId = parentId ?? null;
  const gId = pId != null ? null : goalId ?? null;
  return { ...rest, parentId: pId, goalId: gId };
}
