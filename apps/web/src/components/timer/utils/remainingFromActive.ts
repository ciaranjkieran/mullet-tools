type ActiveTimerTimerLike = {
  kind: "timer";
  endsAt?: string | null;
  plannedSeconds?: number | null;
  startedAt?: string | null;
};

function isTimerActive(x: unknown): x is ActiveTimerTimerLike {
  return (
    typeof x === "object" &&
    x !== null &&
    (x as { kind?: unknown }).kind === "timer"
  );
}

export function remainingFromActive(
  active: unknown,
  nowSec: number
): number | null {
  if (!isTimerActive(active)) return null;

  const endsAtIso = active.endsAt;
  if (endsAtIso) {
    const ends = Math.floor(new Date(endsAtIso).getTime() / 1000);
    return Math.max(0, ends - nowSec);
  }

  // fallback if endsAt missing
  const planned = active.plannedSeconds;
  const startedIso = active.startedAt;

  if (typeof planned === "number" && startedIso) {
    const started = Math.floor(new Date(startedIso).getTime() / 1000);
    const elapsed = Math.max(0, nowSec - started);
    return Math.max(0, planned - elapsed);
  }

  return null;
}
