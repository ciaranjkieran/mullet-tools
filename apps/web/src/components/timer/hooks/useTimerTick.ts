// @shared/api/hooks/timer/useTimerTick.ts
import { useEffect, useRef, useState } from "react";

/**
 * High-accuracy heartbeat for timer UI.
 * - Foreground: requestAnimationFrame loop, sampling ~4x/sec (every 250ms).
 * - Background: 1s setInterval fallback (RAF is heavily throttled in background).
 * Returns Date.now() so consumers stay in epoch-ms space.
 */
export function useTimerTick(foregroundMs: number = 250) {
  const [now, setNow] = useState(() => Date.now());
  const rafId = useRef<number | null>(null);
  const intervalId = useRef<number | null>(null);
  const last = useRef<number>(0);

  const stopRaf = () => {
    if (rafId.current != null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  };
  const stopInterval = () => {
    if (intervalId.current != null) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
  };

  const startRaf = () => {
    stopInterval();
    last.current = performance.now();
    const loop = () => {
      const t = performance.now();
      if (t - last.current >= foregroundMs) {
        last.current = t;
        setNow(Date.now());
      }
      rafId.current = requestAnimationFrame(loop);
    };
    rafId.current = requestAnimationFrame(loop);
  };

  const startInterval = () => {
    stopRaf();
    intervalId.current = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
  };

  useEffect(() => {
    // Start in the right mode based on current visibility
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "visible"
    ) {
      startRaf();
    } else {
      startInterval();
    }

    const onVis = () => {
      if (document.visibilityState === "visible") {
        startRaf();
      } else {
        startInterval();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stopRaf();
      stopInterval();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foregroundMs]);

  return now; // epoch-ms
}
