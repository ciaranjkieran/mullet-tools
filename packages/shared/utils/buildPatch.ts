// shared/api/utils/buildPatch.ts
export function buildPatch<T extends Record<string, any>>(obj: T) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    // include keys explicitly provided (including false/0/""), but skip undefined
    if (v !== undefined) out[k] = v;
  }
  return out;
}
