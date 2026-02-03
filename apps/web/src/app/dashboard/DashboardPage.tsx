"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon, HomeIcon } from "lucide-react";

import PageTitle from "@/components/views/PageTitle";
import ViewHandler from "@/components/views/ViewHandler";

import ModeNotesButton from "@/components/notes/ModeNotesButton";
import ModeBoardsButton from "@/components/boards/ModeBoardsButton";
import ModeTemplatesButton from "@/components/template/ModeTemplatesButton";
import TimerViewButton from "@/components/timer/TimerViewButton";
import ModeCommentsButton from "@/components/comments/ModeCommentsButton";
import ModeStatsButton from "@/components/stats/ModeStatsButton";

import ScrollJumper from "@/components/common/ScrollJumper";
import ModeFilter from "@/components/entities/modes/windows/ModeFilter";
import DialogManager from "@/components/dialogs/DialogManager";

import {
  AddGoalButton,
  AddMilestoneButton,
  AddProjectButton,
  AddTaskButton,
} from "@/components/addbuttons";

import { useViewerStore } from "@/components/boards/viewer/store/useViewerStore";

import { useDialogStore } from "@/lib/dialogs/useDialogStore";
import { useHomeFocusStore } from "@/lib/store/useNavFocusStore";

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

type View =
  | "home"
  | "calendar"
  | "comments"
  | "notes"
  | "boards"
  | "templates"
  | "stats"
  | "timer";

const VIEWS: View[] = [
  "home",
  "calendar",
  "comments",
  "notes",
  "boards",
  "templates",
  "stats",
  "timer",
];

function isView(v: string | null): v is View {
  return !!v && (VIEWS as readonly string[]).includes(v);
}

export default function DashboardPage() {
  // Load data
  useModes();
  useTasks();
  useMilestones();
  useProjects();
  useGoals();

  // Router + URL state
  const router = useRouter();
  const searchParams = useSearchParams();

  // Global view state
  const viewType = useViewStore((s) => s.viewType) as any;
  const setViewType = useViewStore((s) => s.setViewType);

  // URL -> view
  const urlView: View = useMemo(() => {
    const v = searchParams.get("view");
    return isView(v) ? v : "home";
  }, [searchParams]);

  // Keep store in sync with URL
  useEffect(() => {
    // Back-compat: if your store uses "dashboard" for home, you can either:
    // 1) switch the store to "home", or
    // 2) keep mapping here.
    // This sets the store to "home" (preferred). If your store doesn't allow it yet,
    // change this to: setViewType(urlView === "home" ? "dashboard" : urlView)
    try {
      setViewType(urlView as any);
    } catch {
      setViewType((urlView === "home" ? "dashboard" : urlView) as any);
    }
  }, [urlView, setViewType]);

  // One navigation function: store + URL
  const goView = (view: View) => {
    // update store immediately (nice UX)
    try {
      setViewType(view as any);
    } catch {
      setViewType((view === "home" ? "dashboard" : view) as any);
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.replace(`/dashboard?${params.toString()}`);
  };

  const viewerOpen = useViewerStore((s) => s.isOpen);

  // Mode selection
  type MaybeAll = Mode | "All";
  const selectedMode = useModeStore((s) => s.selectedMode) as MaybeAll;
  const setSelectedMode = useModeStore((s) => s.setSelectedMode);

  const activeMode = selectedMode === "All" ? null : selectedMode;
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
      : tasks.filter((t) => t.modeId === (selectedMode as Mode).id);

  // Focus target from Home focus store
  const focusTarget = useHomeFocusStore((s) => s.target);

  const [isModeFocus, setIsModeFocus] = useState(false);
  const [isTodayFocus, setIsTodayFocus] = useState(false);

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
   * 🔌 Bridge: when a focus target arrives, force UI into home + correct mode.
   */
  const lastApplied = useRef<number | null>(null);
  useEffect(() => {
    if (!focusTarget) return;
    if (lastApplied.current === focusTarget.nonce) return;

    // Always go home for focus reveals
    goView("home");

    // Ensure correct mode tab (if provided)
    if (focusTarget.modeId != null && modes.length) {
      const m = modes.find((mm) => mm.id === focusTarget.modeId);
      if (m) {
        if (selectedMode === "All" || (selectedMode as Mode).id !== m.id) {
          setSelectedMode(m);
        }
      }
    }

    lastApplied.current = focusTarget.nonce;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget, modes.length]);

  // Helper for "active" styling based on URL (more reliable than store during transitions)
  const activeView = urlView;

  return (
    <div className="min-h-screen">
      {/* Desktop view buttons */}
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
            onClick={() => goView("home")}
            className={`p-2.5 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
              activeView !== "home" ? "border border-black" : ""
            }`}
            style={
              activeView === "home"
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
            onClick={() => goView("calendar")}
            className={`p-2.5 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
              activeView !== "calendar" ? "border border-black" : ""
            }`}
            style={
              activeView === "calendar"
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
          onClick={() => goView("comments")}
          style={
            activeView === "comments"
              ? { boxShadow: `0 0 0 3px ${modeColor}` }
              : undefined
          }
          className={`p-2.5 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
            activeView !== "comments" ? "border border-black" : ""
          }`}
        />

        <ModeNotesButton
          onClick={() => goView("notes")}
          style={
            activeView === "notes"
              ? { boxShadow: `0 0 0 3px ${modeColor}` }
              : undefined
          }
          className={`p-2.5 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
            activeView !== "notes" ? "border border-black" : ""
          }`}
        />

        <ModeBoardsButton
          onClick={() => goView("boards")}
          style={
            activeView === "boards"
              ? { boxShadow: `0 0 0 3px ${modeColor}` }
              : undefined
          }
          className={`p-2.5 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
            activeView !== "boards" ? "border border-black" : ""
          }`}
        />

        <ModeTemplatesButton
          onClick={() => goView("templates")}
          style={
            activeView === "templates"
              ? { boxShadow: `0 0 0 3px ${modeColor}` }
              : undefined
          }
          className={`p-2.5 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
            activeView !== "templates" ? "border border-black" : ""
          }`}
        />

        <ModeStatsButton
          onClick={() => goView("stats")}
          style={
            activeView === "stats"
              ? { boxShadow: `0 0 0 3px ${modeColor}` }
              : undefined
          }
          className={`p-2.5 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
            activeView !== "stats" ? "border border-black" : ""
          }`}
          modeColor={modeColor}
        />

        <TimerViewButton
          onClick={() => goView("timer")}
          className={`p-2.5 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
            activeView !== "timer" ? "border border-black" : ""
          }`}
          style={
            activeView === "timer"
              ? { boxShadow: `0 0 0 3px ${modeColor}` }
              : undefined
          }
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

        {/* Mobile view buttons */}
        <div
          className="grid md:hidden gap-x-2 gap-y-2 mt-6 mb-4"
          style={{ gridTemplateColumns: "repeat(4, max-content)" }}
        >
          <div>
            <button
              onClick={() => goView("home")}
              className={`p-2.5 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
                activeView !== "home" ? "border border-black" : ""
              }`}
              style={
                activeView === "home"
                  ? { boxShadow: `0 0 0 2px ${modeColor}` }
                  : undefined
              }
              aria-label="Switch to Home View"
              type="button"
            >
              <HomeIcon className="w-6 h-6 text-black" />
            </button>
          </div>

          <div>
            <button
              onClick={() => goView("calendar")}
              className={`p-2.5 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
                activeView !== "calendar" ? "border border-black" : ""
              }`}
              style={
                activeView === "calendar"
                  ? { boxShadow: `0 0 0 2px ${modeColor}` }
                  : undefined
              }
              aria-label="Switch to Calendar View"
              type="button"
            >
              <CalendarIcon className="w-6 h-6 text-black" />
            </button>
          </div>

          <ModeCommentsButton
            onClick={() => goView("comments")}
            style={
              activeView === "comments"
                ? { boxShadow: `0 0 0 3px ${modeColor}` }
                : undefined
            }
            className={`p-2.5 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
              activeView !== "comments" ? "border border-black" : ""
            }`}
          />

          <ModeNotesButton
            onClick={() => goView("notes")}
            style={
              activeView === "notes"
                ? { boxShadow: `0 0 0 2px ${modeColor}` }
                : undefined
            }
            className={`p-2.5 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
              activeView !== "notes" ? "border border-black" : ""
            }`}
          />

          <ModeBoardsButton
            onClick={() => goView("boards")}
            style={
              activeView === "boards"
                ? { boxShadow: `0 0 0 2px ${modeColor}` }
                : undefined
            }
            className={`p-2.5 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
              activeView !== "boards" ? "border border-black" : ""
            }`}
          />

          <ModeTemplatesButton
            onClick={() => goView("templates")}
            style={
              activeView === "templates"
                ? { boxShadow: `0 0 0 2px ${modeColor}` }
                : undefined
            }
            className={`p-2.5 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
              activeView !== "templates" ? "border border-black" : ""
            }`}
          />

          <ModeStatsButton
            onClick={() => goView("stats")}
            style={
              activeView === "stats"
                ? { boxShadow: `0 0 0 2px ${modeColor}` }
                : undefined
            }
            className={`p-2.5 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
              activeView !== "stats" ? "border border-black" : ""
            }`}
            modeColor={modeColor}
          />

          <TimerViewButton
            onClick={() => goView("timer")}
            className={`p-2.5 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer ${
              activeView !== "timer" ? "border border-black" : ""
            }`}
            style={
              activeView === "timer"
                ? { boxShadow: `0 0 0 2px ${modeColor}` }
                : undefined
            }
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
          setSelectedMode={setSelectedMode}
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
          <div className="fixed z-50 bottom-6 right-6 md:bottom-10 md:right-12">
            {/* Mobile: single + */}
            <div className="md:hidden">
              <button
                onClick={() => {
                  setTaskToEdit(null);
                  setIsTaskDialogOpen(true);
                }}
                className="w-14 h-14 rounded-full bg-black text-white text-3xl flex items-center justify-center shadow-lg"
              >
                +
              </button>
            </div>

            {/* Desktop: full stack */}
            <div className="hidden md:flex flex-col items-center gap-4">
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
            </div>
          </div>
        )}
      </section>

      {jumperPos && (
        <div className="hidden md:block">
          <ScrollJumper
            enableBottom={false}
            showAfterVH={1}
            variant="circle"
            diameter={48}
            modeColor={modeColor}
            customPosition={jumperPos}
          />
        </div>
      )}
    </div>
  );
}
