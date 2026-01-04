function remainingFromActive(active: any, nowSec: number): number | null {
  if (!active || active.kind !== "timer") return null;

  const endsAtIso = (active as any).endsAt as string | null | undefined;
  if (endsAtIso) {
    const ends = Math.floor(new Date(endsAtIso).getTime() / 1000);
    return Math.max(0, ends - nowSec);
  }

  // fallback if endsAt missing (shouldn’t happen with your backend)
  const planned = (active as any).plannedSeconds as number | null | undefined;
  const startedIso = (active as any).startedAt as string | null | undefined;
  if (typeof planned === "number" && startedIso) {
    const started = Math.floor(new Date(startedIso).getTime() / 1000);
    const elapsed = Math.max(0, nowSec - started);
    return Math.max(0, planned - elapsed);
  }

  return null;
}
