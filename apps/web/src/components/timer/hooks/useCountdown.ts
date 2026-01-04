// hooks/useCountdown.ts
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Monotonic, drift-free countdown.
 */
export function useCountdown(initialMs: number) {
  const [remainingMs, setRemainingMs] = useState<number>(initialMs);
  const [isRunning, setIsRunning] = useState(false);

  const endTimeRef = useRef<number | null>(null); // performance.now() + remainingMs when started
  const pausedRemainingRef = useRef<number>(initialMs); // snapshot when paused/stopped
  const rafRef = useRef<number | null>(null);

  // start from current remaining
  const start = useCallback(() => {
    if (isRunning) return;
    const now = performance.now();
    endTimeRef.current = now + pausedRemainingRef.current;
    setIsRunning(true);
  }, [isRunning]);

  const pause = useCallback(() => {
    if (!isRunning) return;
    const now = performance.now();
    const end = endTimeRef.current ?? now;
    const rem = Math.max(0, end - now);
    pausedRemainingRef.current = rem;
    endTimeRef.current = null;
    setIsRunning(false);
    setRemainingMs(rem);
  }, [isRunning]);

  const reset = useCallback(
    (ms?: number) => {
      const next = typeof ms === "number" ? ms : initialMs;
      pausedRemainingRef.current = next;
      endTimeRef.current = null;
      setIsRunning(false);
      setRemainingMs(next);
    },
    [initialMs]
  );

  // allow external duration changes
  const setDurationMs = useCallback(
    (ms: number, { soft = false } = {}) => {
      // soft = true: only apply if not running
      if (soft && isRunning) return;
      pausedRemainingRef.current = ms;
      if (!isRunning) setRemainingMs(ms);
    },
    [isRunning]
  );

  // rAF ticker (drift-free)
  useEffect(() => {
    if (!isRunning) return;

    const tick = () => {
      const now = performance.now();
      const end = endTimeRef.current!;
      const rem = Math.max(0, end - now);
      setRemainingMs(rem);
      if (rem <= 0) {
        // auto stop
        pausedRemainingRef.current = 0;
        endTimeRef.current = null;
        setIsRunning(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isRunning]);

  return {
    isRunning,
    remainingMs,
    start,
    pause,
    reset,
    setDurationMs,
  };
}
