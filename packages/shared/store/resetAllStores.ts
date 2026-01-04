// apps/web/src/shared/auth/resetAllStores.ts

import { useModeStore } from "./useModeStore";
import { useGoalStore } from "./useGoalStore";
import { useProjectStore } from "./useProjectStore";
import { useMilestoneStore } from "./useMilestoneStore";
import { useTaskStore } from "./useTaskStore";

import { useBoardStore } from "./useBoardStore";
import { useNoteStore } from "./useNoteStore";
import { useTemplateWorkbenchStore } from "./useTemplateWorkbenchStore";

import { useViewStore } from "./useViewStore";
import { useTimerStore } from "./useTimerStore";

import { useTimerUIStore } from "@/lib/store/useTimerUIStore";
import { useStatsFilterStore } from "./useStatsFilterStore";

export function resetAllStores() {
  // Core hierarchy
  useModeStore.getState().reset?.();
  useGoalStore.getState().reset?.();
  useProjectStore.getState().reset?.();
  useMilestoneStore.getState().reset?.();
  useTaskStore.getState().reset?.();

  // Boards / Notes / Templates
  useBoardStore.getState().reset?.();
  useNoteStore.getState().reset?.();
  useTemplateWorkbenchStore.getState().reset?.();

  // View + Timer
  useViewStore.getState().reset?.();
  useTimerStore.getState().reset?.();
  useTimerUIStore.getState().reset?.();

  // Stats
  useStatsFilterStore.getState().reset?.();
}
