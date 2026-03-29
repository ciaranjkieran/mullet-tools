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

  cache.subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "success") return;

    const key = event.query.queryKey;
    if (!Array.isArray(key) || key.length !== 1) return;

    const syncFn = SYNC_MAP[key[0] as string];
    if (syncFn && event.query.state.data) {
      syncFn(event.query.state.data);
    }
  });
}
