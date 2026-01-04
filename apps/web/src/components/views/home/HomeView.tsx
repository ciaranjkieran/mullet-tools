// components/views/home/HomeView.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Mode } from "@shared/types/Mode";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";
import type { Project } from "@shared/types/Project";
import type { Goal } from "@shared/types/Goal";

import TaskSectionDashboard from "@/components/entities/tasks/containers/dashboard/TaskSectionDashboard";
import MilestoneList, {
  type Container as MilestoneContainer,
} from "@/components/entities/milestones/containers/dashboard/MilestoneList";
import { buildMilestoneTree } from "@/components/entities/milestones/utils/MilestoneTreeBuilder";
import ProjectList from "@/components/entities/projects/containers/dashboard/ProjectList";
import { buildProjectTree } from "@/components/entities/projects/utils/buildProjectTree";
import GoalList from "@/components/entities/goals/containers/dashboard/GoalList";
import { projectEffectiveGoalId } from "@shared/lineage/effective";
import { useHomeFocusStore } from "@/lib/store/useNavFocusStore";

type Props = {
  tasks: Task[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  modes: Mode[];
  selectedMode: Mode | "All";
};

const sortModes = (arr: Mode[]) =>
  [...arr].sort(
    (a, b) =>
      (a.position ?? 0) - (b.position ?? 0) ||
      (a.id as number) - (b.id as number)
  );

export default function HomeView({
  tasks,
  goals,
  projects,
  milestones,
  modes,
  selectedMode,
}: Props) {
  // make "All" comparisons type-safe locally
  type MaybeAll = Mode | "All";
  const isAll = (selectedMode as MaybeAll) === "All";
  const activeMode = isAll ? null : (selectedMode as Mode);

  const [expandedModeStates] = useState<
    Record<number, { scheduled: boolean; unscheduled: boolean }>
  >({});

  const activeModes = useMemo(() => {
    if (isAll) {
      const withContent = modes.filter((m) => {
        const id = m.id;
        return (
          tasks.some((t) => t.modeId === id) ||
          projects.some((p) => p.modeId === id) ||
          milestones.some((mm) => mm.modeId === id) ||
          goals.some((g) => g.modeId === id)
        );
      });
      return sortModes(withContent);
    }
    return sortModes(modes.filter((m) => m.id === (activeMode as Mode).id));
  }, [modes, tasks, projects, milestones, goals, isAll, activeMode]);

  const projectsById = useMemo(
    () => new Map<number, Project>(projects.map((p) => [p.id, p])),
    [projects]
  );

  // ── Focus + scroll + highlight (freeze-proof) ────────────
  const target = useHomeFocusStore((s) => s.target);
  const clearTarget = useHomeFocusStore((s) => s.clearTarget);
  const processedNonces = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!target) return;
    if (processedNonces.current.has(target.nonce)) return; // already handled

    // Wait until the right mode is visible (or in All)
    const modeReady =
      isAll ||
      (target.modeId != null &&
        !isAll &&
        (activeMode as Mode)?.id === target.modeId);

    if (!modeReady) return;

    const prefix =
      target.kind === "project"
        ? "pj"
        : target.kind === "milestone"
        ? "ms"
        : target.kind === "task"
        ? "tk"
        : "gl";
    const domId = `${prefix}-${target.id}`;

    let cancelled = false;
    const start = performance.now();

    const tryFind = () => {
      if (cancelled) return;

      const el = document.getElementById(domId) as HTMLElement | null;
      if (el) {
        // stop future handling of this request
        processedNonces.current.add(target.nonce);

        // Smooth scroll
        el.scrollIntoView({ behavior: "smooth", block: "center" });

        // 🔦 Flashlight (no global CSS): fade a ring using outline + transition.
        // We force a reflow between style writes so the transition runs reliably.
        const prevOutline = el.style.outline;
        const prevOutlineOffset = el.style.outlineOffset;
        const prevTransition = el.style.transition;

        el.style.transition =
          "outline-color 300ms ease, outline-offset 300ms ease";
        el.style.outline = "3px solid rgba(59,130,246,0.6)";
        el.style.outlineOffset = "6px";
        // reflow
        void el.offsetWidth;
        // fade out
        setTimeout(() => {
          el.style.outlineColor = "rgba(59,130,246,0)";
          el.style.outlineOffset = "0px";
        }, 60);
        // cleanup after 900ms
        setTimeout(() => {
          el.style.outline = prevOutline;
          el.style.outlineOffset = prevOutlineOffset;
          el.style.transition = prevTransition;
        }, 900);

        // Clear only after success (prevents effect loop)
        clearTarget();
        return;
      }

      const elapsed = performance.now() - start;
      if (elapsed < 2500) {
        requestAnimationFrame(tryFind);
      }
      // If we time out, we do NOT clearTarget. Leaving it set lets
      // a future data render or tab switch succeed without re-dispatch.
    };

    requestAnimationFrame(tryFind);
    return () => {
      cancelled = true;
    };
  }, [
    target?.nonce,
    isAll,
    activeMode,
    tasks,
    projects,
    milestones,
    goals,
    clearTarget,
  ]);

  // Optional: hash fallback
  useEffect(() => {
    if (typeof window === "undefined") return;
    const scrollAndHighlight = (domId: string) => {
      const start = performance.now();
      const tick = () => {
        const el = document.getElementById(domId) as HTMLElement | null;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          const prev = el.style.outline;
          const prevOff = el.style.outlineOffset;
          const prevTr = el.style.transition;
          el.style.transition =
            "outline-color 300ms ease, outline-offset 300ms ease";
          el.style.outline = "3px solid rgba(59,130,246,0.6)";
          el.style.outlineOffset = "6px";
          void el.offsetWidth;
          setTimeout(() => {
            el.style.outlineColor = "rgba(59,130,246,0)";
            el.style.outlineOffset = "0px";
          }, 60);
          setTimeout(() => {
            el.style.outline = prev;
            el.style.outlineOffset = prevOff;
            el.style.transition = prevTr;
          }, 900);
          return;
        }
        if (performance.now() - start < 1600) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const maybe = () => {
      const h = window.location.hash;
      if (!h || (!h.startsWith("#ms-") && !h.startsWith("#pj-"))) return;
      scrollAndHighlight(h.slice(1));
    };
    maybe();
    const onHash = () => maybe();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [tasks, projects, milestones]);

  // ── Render (unchanged) ───────────────────────────────────
  return (
    <div className="mt-4 space-y-8">
      {activeModes.map((mode) => {
        const modeTasks = tasks.filter((t) => t.modeId === mode.id);
        const scheduled = modeTasks.filter(
          (t) => t.dueDate && !t.milestoneId && !t.projectId && !t.goalId
        );
        const unscheduled = modeTasks.filter(
          (t) => !t.dueDate && !t.milestoneId && !t.projectId && !t.goalId
        );

        const modeRootProjects = projects.filter(
          (p) =>
            p.modeId === mode.id &&
            projectEffectiveGoalId(p.id, projectsById) == null
        );
        const projectTree = buildProjectTree(modeRootProjects, null);

        const topLevelMilestones = milestones.filter(
          (m) => m.modeId === mode.id && !m.projectId && !m.goalId
        );
        const milestoneTree = buildMilestoneTree(
          topLevelMilestones,
          mode.id,
          undefined
        );

        const goalsInMode = goals.filter((g) => g.modeId === mode.id);

        const expanded = expandedModeStates[mode.id] ?? {
          scheduled: true,
          unscheduled: true,
        };

        return (
          <div key={mode.id} className="space-y-6">
            {isAll && (
              <h2
                className="text-lg font-semibold pl-3 py-1 border-l-4"
                style={{ borderColor: mode.color }}
              >
                {mode.title}
              </h2>
            )}

            <TaskSectionDashboard
              tasks={[...scheduled, ...unscheduled]}
              mode={mode}
              modes={modes}
            />

            {milestoneTree.length > 0 && (
              <MilestoneList
                parentId={null}
                milestones={milestoneTree}
                depth={0}
                mode={mode}
                modes={modes}
                tasks={tasks}
                container={{ kind: "mode", id: mode.id } as MilestoneContainer}
              />
            )}

            {projectTree.length > 0 && (
              <ProjectList
                parentId={null}
                projects={projectTree}
                depth={0}
                mode={mode}
                modes={modes}
                tasks={tasks}
                milestones={milestones}
                container={{ kind: "mode", id: mode.id }}
              />
            )}

            {goalsInMode.length > 0 && (
              <GoalList
                goals={goalsInMode}
                projects={projects}
                tasks={tasks}
                milestones={milestones}
                mode={mode}
                modes={modes}
                depth={0}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
