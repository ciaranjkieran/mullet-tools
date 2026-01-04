"use client";

import { useState, useEffect, useRef } from "react";
import { CalendarIcon, HomeIcon } from "lucide-react";
import PageTitle from "@/components/views/PageTitle";
import ModeNotesButton from "@/components/notes/ModeNotesButton";
import ModeBoardsButton from "@/components/boards/ModeBoardsButton";
import ModeTemplatesButton from "@/components/template/ModeTemplatesButton";
import TimerViewButton from "@/components/timer/TimerViewButton";
import ScrollJumper from "@/components/common/ScrollJumper";
import { useViewerStore } from "@/components/boards/viewer/store/useViewerStore";
import { useRouter } from "next/navigation";

import { useViewStore } from "@shared/store/useViewStore";
import { useModeStore } from "@shared/store/useModeStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useGoalStore } from "@shared/store/useGoalStore";

import { useGoals } from "@shared/api/hooks/goals/useGoals";
import { useMilestones } from "@shared/api/hooks/milestones/useMilestones";
import { useModes } from "@shared/api/hooks/modes/useModes";
import { useProjects } from "@shared/api/hooks/projects/useProjects";
import { useTasks } from "@shared/api/hooks/tasks/useTasks";
import type { Mode } from "@shared/types/Mode";

import { useDialogStore } from "@/lib/dialogs/useDialogStore";
import DialogManager from "@/components/dialogs/DialogManager";
import ModeFilter from "@/components/entities/modes/windows/ModeFilter";
import ModeCommentsButton from "@/components/comments/ModeCommentsButton";
import ModeStatsButton from "@/components/stats/ModeStatsButton";
import BatchEditorWindow from "@/components/batch/BatchEditorWindow";
import { useBatchEditorStore } from "@/lib/store/useBatchEditorStore";
import {
  AddGoalButton,
  AddMilestoneButton,
  AddProjectButton,
  AddTaskButton,
} from "@/components/addbuttons";
import ViewHandler from "@/components/views/ViewHandler";

import { getContrastingText } from "@shared/utils/getContrastingText";
import { useHomeFocusStore } from "@/lib/store/useNavFocusStore";

export default function DashboardPage() {
  // Load data
  useModes();
  useTasks();
  useMilestones();
  useProjects();
  useGoals();

  // Global view state
  const viewType = useViewStore((s) => s.viewType);
  const setViewType = useViewStore((s) => s.setViewType);
  const viewerOpen = useViewerStore((s) => s.isOpen);
  const router = useRouter();
  const goView = (view: string) => {
    const href = view === "home" ? "/dashboard" : `/dashboard/${view}`;
    router.replace(href);
  };
  // Mode selection (treat as Mode | "All" locally for type-safety)
  type MaybeAll = Mode | "All";
  const selectedMode = useModeStore((s) => s.selectedMode) as MaybeAll;
  const setSelectedMode = useModeStore((s) => s.setSelectedMode);

  const activeMode = selectedMode === "All" ? null : selectedMode;
  const showModeTitle = selectedMode === "All";

  const isOpen = useBatchEditorStore((s) => s.isBatchEditorOpen);
  const setIsOpen = useBatchEditorStore((s) => s.setIsBatchEditorOpen);

  // Focus target from Home focus store (HomeView clears it after reveal)
  const focusTarget = useHomeFocusStore((s) => s.target);

  // Local UI state
  const [isModeFocus, setIsModeFocus] = useState(false);
  const [isTodayFocus, setIsTodayFocus] = useState(false);

  // Global entity state
  const modes = useModeStore((s) => s.modes);
  const tasks = useTaskStore((s) => s.tasks);
  const milestones = useMilestoneStore((s) => s.milestones);
  const projects = useProjectStore((s) => s.projects);
  const goals = useGoalStore((s) => s.goals);

  const {
    setIsTaskDialogOpen,
    setTaskToEdit,
    setIsMilestoneDialogOpen,
    setMilestoneToEdit,
    setIsProjectDialogOpen,
    setProjectToEdit,
    setIsGoalDialogOpen,
    setGoalToEdit,
    setIsEditModesOpen,
  } = useDialogStore();

  const fallbackModeId = activeMode?.id ?? modes[0]?.id;
  const modeColor = activeMode?.color || "#000000";

  const filteredTasks =
    selectedMode === "All"
      ? tasks
      : tasks.filter((t) => t.modeId === selectedMode.id);

  const [jumperPos, setJumperPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    const listEl = document.querySelector(".max-w-4xl");
    const fabsEl = document.querySelector(".fixed.bottom-10.right-12");
    if (!listEl || !fabsEl) return;

    const update = () => {
      const listRect = listEl.getBoundingClientRect();
      const fabsRect = fabsEl.getBoundingClientRect();
      const midX = listRect.right + (fabsRect.left - listRect.right) / 2;
      const midY = window.innerHeight / 2;
      const SHIFT_LEFT = window.innerWidth < 768 ? 12 : 24;
      setJumperPos({ top: midY, left: midX - SHIFT_LEFT });
    };

    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsTodayFocus(false);
        setIsModeFocus(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  /**
   * 🔌 Bridge: when a focus target arrives, force the UI to the right place.
   * Guard with nonce so we run exactly once per request.
   */
  const lastApplied = useRef<number | null>(null);
  useEffect(() => {
    if (!focusTarget) return;
    if (lastApplied.current === focusTarget.nonce) return; // already handled

    // 1) Ensure Home/Dashboard view
    if (viewType !== "dashboard") {
      setViewType("dashboard");
    }

    // 2) Ensure correct mode tab (if provided)
    if (focusTarget.modeId != null && modes.length) {
      const m = modes.find((mm) => mm.id === focusTarget.modeId);
      if (m) {
        if (selectedMode === "All" || selectedMode.id !== m.id) {
          setSelectedMode(m);
        }
      }
    }

    lastApplied.current = focusTarget.nonce;
  }, [
    focusTarget?.nonce,
    modes,
    viewType,
    selectedMode,
    setSelectedMode,
    setViewType,
  ]);

  return (
    <div className="min-h-screen">
      <div className="hidden md:grid md:grid-cols-2 gap-6 absolute top-[6.5rem] left-10 z-40 ml-8">
        <div className="relative inline-flex items-center group">
          <span
            className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 
               whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs 
               font-medium text-white shadow-lg opacity-0 transition-opacity
               group-hover:opacity-100"
          >
            Home
          </span>

          <button
            onClick={() => setViewType("dashboard")}
            className={`p-3 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
              viewType !== "dashboard" ? "border border-black" : ""
            }`}
            style={
              viewType === "dashboard"
                ? { boxShadow: `0 0 0 3px ${modeColor}` }
                : undefined
            }
            aria-label="Switch to Home View"
            type="button"
          >
            <HomeIcon className="w-6 h-6 text-black" />
          </button>
        </div>

        <div className="relative inline-flex items-center group">
          <span
            className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 
               whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs 
               font-medium text-white shadow-lg opacity-0 transition-opacity
               group-hover:opacity-100"
          >
            Calendar
          </span>

          <button
            onClick={() => setViewType("calendar")}
            className={`p-3 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
              viewType !== "calendar" ? "border border-black" : ""
            }`}
            style={
              viewType === "calendar"
                ? { boxShadow: `0 0 0 3px ${modeColor}` }
                : undefined
            }
            aria-label="Switch to Calendar View"
            type="button"
          >
            <CalendarIcon className="w-6 h-6 text-black" />
          </button>
        </div>

        <ModeCommentsButton
          style={
            viewType === "comments"
              ? { boxShadow: `0 0 0 3px ${modeColor}` }
              : undefined
          }
          className={`p-3 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
            viewType !== "comments" ? "border border-black" : ""
          }`}
        />

        <ModeNotesButton
          style={
            viewType === "notes"
              ? { boxShadow: `0 0 0 3px ${modeColor}` }
              : undefined
          }
          className={`p-3 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
            viewType !== "notes" ? "border border-black" : ""
          }`}
        />

        <ModeBoardsButton
          style={
            viewType === "boards"
              ? { boxShadow: `0 0 0 3px ${modeColor}` }
              : undefined
          }
          className={`p-3 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
            viewType !== "boards" ? "border border-black" : ""
          }`}
        />

        <ModeTemplatesButton
          style={
            viewType === "templates"
              ? { boxShadow: `0 0 0 3px ${modeColor}` }
              : undefined
          }
          className={`p-3 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
            viewType !== "templates" ? "border border-black" : ""
          }`}
        />

        <ModeStatsButton
          style={
            viewType === "stats"
              ? { boxShadow: `0 0 0 3px ${modeColor}` }
              : undefined
          }
          className={`p-3 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
            viewType !== "stats" ? "border border-black" : ""
          }`}
          modeColor={modeColor}
        />

        <TimerViewButton
          modeColor={modeColor}
          className={`p-3 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
            viewType !== "timer" ? "border border-black" : ""
          }`}
        />
      </div>

      {/* Main Section */}
      <section className="max-w-4xl mx-auto p-8">
        <div className="flex justify-between items-center mb-4">
          <PageTitle />
          {!isModeFocus && (
            <button
              onClick={() => setIsEditModesOpen(true)}
              className="text-sm bg-black text-white px-3 py-1 rounded cursor-pointer"
            >
              Edit Modes
            </button>
          )}
        </div>

        {/* Mobile view buttons (under ModeFilter) */}
        <div className="flex md:hidden items-center gap-2 mt-2 mb-4 flex-wrap">
          <button
            onClick={() => goView("home")}
            className={`p-2 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
              viewType !== "dashboard" ? "border border-black" : ""
            }`}
            style={
              viewType === "dashboard"
                ? { boxShadow: `0 0 0 2px ${modeColor}` }
                : undefined
            }
            aria-label="Switch to Home View"
            type="button"
          >
            <HomeIcon className="w-5 h-5 text-black" />
          </button>

          <button
            onClick={() => goView("calendar")}
            className={`p-2 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
              viewType !== "calendar" ? "border border-black" : ""
            }`}
            style={
              viewType === "calendar"
                ? { boxShadow: `0 0 0 2px ${modeColor}` }
                : undefined
            }
            aria-label="Switch to Calendar View"
            type="button"
          >
            <CalendarIcon className="w-5 h-5 text-black" />
          </button>

          <ModeCommentsButton
            style={
              viewType === "comments"
                ? { boxShadow: `0 0 0 2px ${modeColor}` }
                : undefined
            }
            className={`p-2 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
              viewType !== "comments" ? "border border-black" : ""
            }`}
          />

          <ModeNotesButton
            style={
              viewType === "notes"
                ? { boxShadow: `0 0 0 2px ${modeColor}` }
                : undefined
            }
            className={`p-2 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
              viewType !== "notes" ? "border border-black" : ""
            }`}
          />

          <ModeBoardsButton
            style={
              viewType === "boards"
                ? { boxShadow: `0 0 0 2px ${modeColor}` }
                : undefined
            }
            className={`p-2 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
              viewType !== "boards" ? "border border-black" : ""
            }`}
          />

          <ModeTemplatesButton
            style={
              viewType === "templates"
                ? { boxShadow: `0 0 0 2px ${modeColor}` }
                : undefined
            }
            className={`p-2 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
              viewType !== "templates" ? "border border-black" : ""
            }`}
          />

          <ModeStatsButton
            style={
              viewType === "stats"
                ? { boxShadow: `0 0 0 2px ${modeColor}` }
                : undefined
            }
            className={`p-2 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
              viewType !== "stats" ? "border border-black" : ""
            }`}
            modeColor={modeColor}
          />

          <TimerViewButton
            modeColor={modeColor}
            className={`p-2 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
              viewType !== "timer" ? "border border-black" : ""
            }`}
          />
        </div>

        <ModeFilter isModeFocus={isModeFocus} setIsModeFocus={setIsModeFocus} />

        <ViewHandler
          tasks={filteredTasks}
          goals={goals}
          projects={projects}
          milestones={milestones}
          modes={modes}
          selectedMode={selectedMode}
          showModeTitle={selectedMode === "All"}
          isTodayFocus={isTodayFocus}
          setIsTodayFocus={setIsTodayFocus}
          setSelectedMode={setSelectedMode} // <- NEW
        />

        <DialogManager
          modes={modes}
          tasks={tasks}
          goals={goals}
          projects={projects}
          milestones={milestones}
          fallbackModeId={fallbackModeId}
        />

        {!viewerOpen && (
          <div className="fixed bottom-10 right-12 z-50 flex flex-row items-end gap-4">
            <div className="flex flex-col items-center gap-4">
              {(() => {
                const textColor = getContrastingText(modeColor);

                return (
                  <>
                    <AddGoalButton
                      onClick={() => {
                        setGoalToEdit(null);
                        setIsGoalDialogOpen(true);
                      }}
                      modeColor={modeColor}
                    />
                    <AddProjectButton
                      onClick={() => {
                        setProjectToEdit(null);
                        setIsProjectDialogOpen(true);
                      }}
                      modeColor={modeColor}
                    />
                    <AddMilestoneButton
                      onClick={() => {
                        setMilestoneToEdit(null);
                        setIsMilestoneDialogOpen(true);
                      }}
                      modeColor={modeColor}
                    />
                    <AddTaskButton
                      onClick={() => {
                        setTaskToEdit(null);
                        setIsTaskDialogOpen(true);
                      }}
                      modeColor={modeColor}
                    />
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </section>

      {jumperPos && (
        <ScrollJumper
          enableBottom={false}
          showAfterVH={1}
          variant="circle"
          diameter={48}
          modeColor={modeColor}
          customPosition={jumperPos}
        />
      )}
    </div>
  );
}
