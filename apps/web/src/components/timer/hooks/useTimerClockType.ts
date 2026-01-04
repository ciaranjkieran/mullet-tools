// src/components/timer/TimerView/hooks/useTimerClockType.ts
/**
 * useTimerClockType
 *
 * Keeps the clockType in sync with any "intent" set elsewhere
 * (e.g. LaunchTimerRailButton setting a preferred mode).
 */

import { useEffect } from "react";
import { useTimerUIStore } from "@/lib/store/useTimerUIStore";

export function useTimerClockType() {
  const clockType = useTimerUIStore((s) => s.clockType);
  const setClockType = useTimerUIStore((s) => s.setClockType);
  const consumeClockTypeIntent = useTimerUIStore(
    (s) => s.consumeClockTypeIntent
  );
  const clockTypeIntentObj = useTimerUIStore((s) => s.clockTypeIntent);

  useEffect(() => {
    const intent = consumeClockTypeIntent();
    if (intent) {
      setClockType(intent);
    }
  }, [clockTypeIntentObj, consumeClockTypeIntent, setClockType]);

  return { clockType, setClockType };
}
