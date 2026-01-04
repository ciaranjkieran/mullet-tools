// @shared/utils/ancestors.ts
type Ancestors = {
  goalId?: number | null;
  projectId?: number | null;
  milestoneId?: number | null;
  parentId?: number | null; // for project/milestone editors
};

export function ensureExactlyOne<T extends Ancestors>(
  obj: T,
  keys: (keyof T)[]
): keyof T | null {
  const set = keys.filter((k) => obj[k] != null);
  if (set.length !== 1) return null;
  return set[0];
}

export function normalizeXor<T extends Ancestors>(obj: T, keep: keyof T): T {
  const out = { ...obj };
  (Object.keys(out) as (keyof T)[]).forEach((k) => {
    if (
      k !== keep &&
      (k === "goalId" ||
        k === "projectId" ||
        k === "milestoneId" ||
        k === "parentId")
    ) {
      (out as any)[k] = null;
    }
  });
  return out;
}
