// dndIdsGoals.ts
export const gid = (id: number) => `goal:${id}`;

export const parseGid = (s: string) => Number(String(s).split(":")[1]);

// (Optional) tiny helpers if you want extra safety:
export const isGid = (s: string) => String(s).startsWith("goal:");
export const tryParseGid = (s: string) => (isGid(s) ? parseGid(s) : NaN);
