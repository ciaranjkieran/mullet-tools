// Compare current selection vs active timer path, safely
import { pathToIdPayload } from "../utils/timerPath";

export type Sel = {
  modeId: number;
  goalId: number | null;
  projectId: number | null;
  milestoneId: number | null;
  taskId: number | null;
};

export function idsFromActivePath(active: unknown): Partial<Sel> {
  // Your hook returns { data: active } where active?.path exists when running
  const a = active as any;
  if (!a?.path) return {};
  return pathToIdPayload(a.path);
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
