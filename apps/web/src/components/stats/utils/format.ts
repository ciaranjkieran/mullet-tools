// components/stats/utils/format.ts

/**
 * Turn a number of seconds into a human-readable string.
 * Examples:
 *  - 90   -> "1m 30s"
 *  - 3600 -> "1h"
 *  - 3725 -> "1h 2m"
 */
export function fmtDuration(totalSeconds: number | null | undefined): string {
  const secs = Math.max(0, Math.floor(totalSeconds ?? 0));

  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (hours === 0 && minutes === 0) {
    parts.push(`${seconds}s`);
  }

  return parts.join(" ");
}
