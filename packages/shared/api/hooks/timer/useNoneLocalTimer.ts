// hooks/useNoneLocalTimer.ts
"use client";

import { useCallback, useRef, useState } from "react";

export type NoneTimerKind = "stopwatch" | "timer";

type State = {
  running: boolean;
  kind: NoneTimerKind;
  startedAt: number | null; // epoch ms
  plannedSeconds: number | null; // only for "timer"
  accumulatedMs: number; // if you ever add pause/resume
};

export function useNoneLocalTimer() {
  const [state, setState] = useState<State>({
    running: false,
    kind: "stopwatch",
    startedAt: null,
    plannedSeconds: null,
    accumulatedMs: 0,
  });

  const lastStartRef = useRef<number | null>(null);

  const start = useCallback((kind: NoneTimerKind, seconds: number) => {
    const now = Date.now();
    setState({
      running: true,
      kind,
      startedAt: now,
      plannedSeconds: kind === "timer" ? Math.max(0, seconds | 0) : null,
      accumulatedMs: 0,
    });
    lastStartRef.current = now;
  }, []);

  const stop = useCallback(() => {
    setState((s) => ({
      running: false,
      kind: s.kind,
      startedAt: null,
      plannedSeconds: s.plannedSeconds,
      accumulatedMs: 0,
    }));
    lastStartRef.current = null;
  }, []);

  /** Pure derivation from an external clock (`nowMs`) */
  const derive = useCallback(
    (nowMs: number) => {
      if (!state.running || state.startedAt == null) {
        return { elapsedSec: 0, remainingSec: state.plannedSeconds };
      }
      const elapsedMs = nowMs - state.startedAt + state.accumulatedMs;
      const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));

      if (state.kind === "timer") {
        const total = state.plannedSeconds ?? 0;
        const remainingSec = Math.max(0, total - elapsedSec);
        return { elapsedSec, remainingSec };
      }
      return { elapsedSec, remainingSec: null as number | null };
    },
    [
      state.running,
      state.startedAt,
      state.accumulatedMs,
      state.kind,
      state.plannedSeconds,
    ]
  );

  return {
    running: state.running,
    kind: state.kind,
    plannedSeconds: state.plannedSeconds,
    startedAtMs: state.startedAt, // <- expose for UI shim
    start,
    stop,
    derive,
  };
}
