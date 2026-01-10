// Compare current selection vs active timer path, safely
import { pathToIdPayload } from "../utils/timerPath";

export type Sel = {
  modeId: number;
  goalId: number | null;
  projectId: number | null;
  milestoneId: number | null;
  taskId: number | null;
};

function hasPath(x: unknown): x is { path: unknown } {
  return typeof x === "object" && x !== null && "path" in x;
}

export function idsFromActivePath(active: unknown): Partial<Sel> {
  if (!hasPath(active) || !active.path) return {};
  return pathToIdPayload(active.path);
}

export function sameSelection(
  a?: Partial<Sel> | null,
  b?: Partial<Sel> | null
) {
  const nz = (v: unknown) => (v === undefined ? null : v);
  return (
    nz(a?.modeId) === nz(b?.modeId) &&
    nz(a?.goalId) === nz(b?.goalId) &&
    nz(a?.projectId) === nz(b?.projectId) &&
    nz(a?.milestoneId) === nz(b?.milestoneId) &&
    nz(a?.taskId) === nz(b?.taskId)
  );
}
