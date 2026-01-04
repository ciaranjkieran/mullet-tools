// @shared/store/useBindTimerStore.ts
"use client";

import { useEffect } from "react";
import { useTimerStore } from "./useTimerStore";
import { useActiveTimer } from "../../../packages/shared/api/hooks/timer/useActiveTimer";
import { useStartTimer } from "../../../packages/shared/api/hooks/timer/useStartTimer";
import { useStopTimer } from "../../../packages/shared/api/hooks/timer/useStopTimer";
import { StartTimerPayload } from "../../../packages/shared/types/Timer";

export function useBindTimerStore() {
  const setActive = useTimerStore((s) => s.setActive);
  const setActions = useTimerStore((s) => s.setActions);

  const activeQuery = useActiveTimer();
  const startMut = useStartTimer();
  const stopMut = useStopTimer();

  // keep store in sync with server active timer
  useEffect(() => {
    // if query is 401 etc, data will be undefined — we only set when it’s known
    if (activeQuery.data !== undefined) {
      setActive(activeQuery.data ?? null);
    }
  }, [activeQuery.data, setActive]);

  // wire imperative actions (start/stop)
  useEffect(() => {
    setActions(
      async (payload: StartTimerPayload) => {
        await startMut.mutateAsync(payload);
      },
      async () => {
        await stopMut.mutateAsync();
      }
    );
  }, [setActions, startMut, stopMut]);
}
