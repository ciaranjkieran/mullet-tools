import { useState, useEffect, useRef } from "react";
import { AppState } from "react-native";

/**
 * Returns a `nowMs` value that updates ~4x/sec while the app is foregrounded.
 * On background → foreground transition, forces an immediate tick
 * so the display catches up to real time.
 */
export function useTimerTick(active: boolean): number {
  const [nowMs, setNowMs] = useState(Date.now);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Tick every 250ms for smooth updates
    intervalRef.current = setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    // Listen for app state changes to re-sync on foreground
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setNowMs(Date.now());
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [active]);

  return nowMs;
}
