/**
 * Sync React Query cache → Zustand stores outside of React's render cycle.
 *
 * This replaces the useEffect-based sync that caused React error #300
 * (setState during render) when query data arrived synchronously.
 *
 * Call setupCacheSync(queryClient) once at app boot, after creating
 * the QueryClient.
 */
import type { QueryClient } from "@tanstack/react-query";
import { useGoalStore } from "../../store/useGoalStore";
import { useProjectStore } from "../../store/useProjectStore";
import { useMilestoneStore } from "../../store/useMilestoneStore";
import { useTaskStore } from "../../store/useTaskStore";
import { useModeStore } from "../../store/useModeStore";

const SYNC_MAP: Record<string, (data: any) => void> = {
  goals: (data) => useGoalStore.getState().setGoals(data),
  projects: (data) => useProjectStore.getState().setProjects(data),
  milestones: (data) => useMilestoneStore.getState().setMilestones(data),
  tasks: (data) => useTaskStore.getState().setTasks(data),
  modes: (data) => useModeStore.getState().setModes(data),
};

export function setupCacheSync(queryClient: QueryClient) {
  const cache = queryClient.getQueryCache();
  let pending = false;
  let queued = new Map<string, any>();

  cache.subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "success") return;

    const key = event.query.queryKey;
    if (!Array.isArray(key) || key.length !== 1) return;

    const name = key[0] as string;
    if (!(name in SYNC_MAP) || !event.query.state.data) return;

    queued.set(name, event.query.state.data);

    if (!pending) {
      pending = true;
      // Use setTimeout(0) instead of requestAnimationFrame — rAF can fire
      // in the same frame as React's scheduler work, but setTimeout(0)
      // guarantees a separate macrotask that can't overlap with rendering.
      setTimeout(() => {
        const batch = queued;
        queued = new Map();
        pending = false;
        for (const [k, data] of batch) {
          SYNC_MAP[k](data);
        }
      }, 0);
    }
  });
}
