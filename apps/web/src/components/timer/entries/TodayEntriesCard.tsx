"use client";

import { useMemo, useState, useEffect } from "react";
import { Target as TargetIcon } from "lucide-react";
import { getContrastingText } from "@shared/utils/getContrastingText";

import { Mode } from "@shared/types/Mode";
import { Goal } from "@shared/types/Goal";
import { Project } from "@shared/types/Project";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";
import { TimeEntryDTO, ActiveTimerDTO } from "@shared/types/Timer";
import { useDeleteTimeEntry } from "@shared/api/hooks/timer/useDeleteTimeEntry";
import ConfirmDialog from "../../../lib/utils/ConfirmDialog";

export type ResumeFromEntryOpts = {
  remainingSeconds?: number;
  resumeFromEntryId?: number;
};
type Props = {
  entries: TimeEntryDTO[];
  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  modeColor: string;
  onResume: (entry: TimeEntryDTO, opts?: ResumeFromEntryOpts) => void;
  filterModeId?: number | null;
  resolvePlannedSeconds?: (entry: TimeEntryDTO) => number | null;

  /** Optional: let parent switch mode when resuming from All view */
  onRequestFilterMode?: (modeId: number) => void;
};

export default function TodayEntriesCard({
  entries,
  modes,
  goals,
  projects,
  milestones,
  tasks,
  modeColor,
  onResume,
  filterModeId = null,
  resolvePlannedSeconds,
  onRequestFilterMode,
}: Props) {
  const delMut = useDeleteTimeEntry();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // rolling "now" so the 24h window is truly time-based, not calendar-based
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000); // tick every minute
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!delMut.isPending) {
      setPendingDeleteId(null);
      setConfirmOpen(false);
    }
  }, [delMut.isPending]);

  const maps = useMemo(
    () => ({
      modesById: new Map(modes.map((m) => [m.id, m])),
      tasksById: new Map(tasks.map((t) => [t.id, t])),
      milestonesById: new Map(milestones.map((m) => [m.id, m])),
      projectsById: new Map(projects.map((p) => [p.id, p])),
      goalsById: new Map(goals.map((g) => [g.id, g])),
    }),
    [modes, tasks, milestones, projects, goals]
  );

  const deriveModeId = (e: TimeEntryDTO | ActiveTimerDTO): number | null => {
    const p = (e as any).path;
    if (!p) return null;
    if (p.modeId != null) return p.modeId;
    if (p.taskId && maps.tasksById.get(p.taskId)?.modeId != null)
      return maps.tasksById.get(p.taskId)!.modeId!;
    if (p.milestoneId && maps.milestonesById.get(p.milestoneId)?.modeId != null)
      return maps.milestonesById.get(p.milestoneId)!.modeId!;
    if (p.projectId && maps.projectsById.get(p.projectId)?.modeId != null)
      return maps.projectsById.get(p.projectId)!.modeId!;
    if (p.goalId && maps.goalsById.get(p.goalId)?.modeId != null)
      return maps.goalsById.get(p.goalId)!.modeId!;
    return null;
  };

  function within24hFromEnd(endISO?: string | null, nowMs?: number) {
    if (!endISO) return false;
    const ended = new Date(endISO).getTime();
    const baseNow = typeof nowMs === "number" ? nowMs : Date.now();
    const diff = baseNow - ended;
    return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
  }

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const modeId = deriveModeId(e);
      const passesMode = filterModeId == null ? true : modeId === filterModeId;
      const inWindow = within24hFromEnd(e.endedAt, now);
      return passesMode && inWindow;
    });
  }, [entries, filterModeId, now]);

  const filteredSorted = useMemo(() => {
    const ts = (e: TimeEntryDTO) =>
      e.endedAt
        ? new Date(e.endedAt).getTime()
        : e.startedAt
        ? new Date(e.startedAt).getTime()
        : 0;
    return [...filtered].sort((a, b) => ts(b) - ts(a));
  }, [filtered]);

  const grouped = useMemo(() => {
    const groups = {
      today: [] as TimeEntryDTO[],
      yesterday: [] as TimeEntryDTO[],
    };

    for (const e of filteredSorted) {
      const label = classifyEntryDay(e, now);
      if (!label) continue;
      groups[label].push(e);
    }

    return groups;
  }, [filteredSorted, now]);

  const askDelete = (entryId: number, canDelete: boolean) => {
    if (!canDelete || delMut.isPending) return;
    setPendingDeleteId(entryId);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (pendingDeleteId != null && !delMut.isPending) {
      delMut.mutate(pendingDeleteId);
    }
  };

  const renderEntry = (e: TimeEntryDTO) => {
    const meta = getMetaFromPath(e, maps, deriveModeId);
    const canAct = within24hFromEnd(e.endedAt, now);
    const remaining = getRemainingSeconds(e, resolvePlannedSeconds);
    const isResumable = isEntryResumable(e, maps);
    const canResume = canAct && isResumable;

    const modeIdForEntry = deriveModeId(e);

    return (
      <li key={e.id} className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {getEntityIcon(meta.type, meta.color)}
          <div className="truncate">
            <div className="text-sm font-medium truncate">
              {meta.title || "Untitled"}
            </div>
            <div className="text-xs text-gray-500">
              {formatRange(e.startedAt, e.endedAt)} · {fmtSeconds(e.seconds)}
              {remaining != null && (
                <>
                  {" "}
                  &middot;{" "}
                  {remaining === 0 ? "done" : `${fmtSeconds(remaining)} left`}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canResume && (
            <button
              onClick={() => {
                if (!canResume) return;

                // If we're in "All" (no filter) and we know this entry's mode,
                // ask the parent to switch to that mode before resuming.
                if (
                  filterModeId == null &&
                  modeIdForEntry != null &&
                  onRequestFilterMode
                ) {
                  onRequestFilterMode(modeIdForEntry);
                }

                onResume(e, {
                  remainingSeconds: remaining ?? undefined,
                  resumeFromEntryId: e.id,
                });

                window.scrollTo({ top: 72, behavior: "smooth" });
              }}
              disabled={!canResume}
              style={{
                ["--btn" as any]: meta.color,
                ["--btnText" as any]: getContrastingText(meta.color),
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition
              border bg-[var(--btn)] text-[var(--btnText)] border-[var(--btn)]
              hover:bg-transparent hover:text-[var(--btn)]
              active:scale-95
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--btn)]
              ${canResume ? "" : "opacity-50 cursor-not-allowed"}`}
            >
              Resume
            </button>
          )}

          <button
            onClick={() => askDelete(e.id, canAct)}
            disabled={!canAct || delMut.isPending}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition
              border border-red-500 text-red-600
              hover:bg-red-500 hover:text-white
              active:scale-95
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500
              ${canAct ? "" : "opacity-50 cursor-not-allowed"}`}
          >
            {delMut.isPending && pendingDeleteId === e.id
              ? "Deleting…"
              : "Delete"}
          </button>
        </div>
      </li>
    );
  };

  return (
    <div
      className="rounded-2xl border-2 p-6"
      style={{ borderColor: modeColor }}
    >
      <h3 className="text-lg font-semibold mb-1">Today & Yesterday</h3>
      <p className="text-xs text-gray-500 mb-4">
        Sessions that ended in the last 24&nbsp;hours are shown below, grouped
        by day. You can resume active items or delete them; completed items can
        only be deleted.
      </p>

      {filteredSorted.length === 0 ? (
        <div className="text-gray-500 text-sm">
          {filterModeId == null
            ? "Pick a mode to start timing, and gathering stats."
            : "No entries ended in the last 24 hours for this mode."}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.today.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Today</h4>
              <ul className="space-y-3">
                {grouped.today.map((e) => renderEntry(e))}
              </ul>
            </div>
          )}

          {grouped.yesterday.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Yesterday</h4>
              <ul className="space-y-3">
                {grouped.yesterday.map((e) => renderEntry(e))}
              </ul>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          if (!delMut.isPending) {
            setConfirmOpen(false);
            setPendingDeleteId(null);
          }
        }}
        onConfirm={confirmDelete}
        title="Delete this log?"
        description="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}

/* helpers */

function classifyEntryDay(
  e: TimeEntryDTO,
  nowMs?: number
): "today" | "yesterday" | null {
  if (!e.endedAt) return null;

  const ended = new Date(e.endedAt);
  const now = new Date(typeof nowMs === "number" ? nowMs : Date.now());

  const endedStr = ended.toDateString();
  const todayStr = now.toDateString();

  // yesterday = today minus 1 day (local time)
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  if (endedStr === todayStr) return "today";
  if (endedStr === yesterdayStr) return "yesterday";
  return null;
}

function getPlannedSecondsFromEntry(e: TimeEntryDTO): number | null {
  const plannedFromEntry = (e as any).plannedSeconds as number | undefined;
  return typeof plannedFromEntry === "number" ? plannedFromEntry : null;
}

function getRemainingSeconds(
  e: TimeEntryDTO,
  resolvePlannedSeconds?: (entry: TimeEntryDTO) => number | null
): number | null {
  const planned =
    getPlannedSecondsFromEntry(e) ??
    (resolvePlannedSeconds ? resolvePlannedSeconds(e) : null);
  if (planned == null) return null;
  const elapsed = e.seconds ?? 0;
  return Math.max(0, planned - elapsed);
}

/**
 * Decide whether an entry can be resumed:
 * - if the underlying entity is missing -> treat as completed (no resume)
 * - if is_completed / is_archived / archived_at -> no resume
 */
function isEntryResumable(
  e: TimeEntryDTO,
  maps: {
    modesById: Map<number, Mode>;
    goalsById: Map<number, Goal>;
    projectsById: Map<number, Project>;
    milestonesById: Map<number, Milestone>;
    tasksById: Map<number, Task>;
  }
): boolean {
  const p: any = (e as any).path;
  if (!p) return true; // mode-only / floating entry → still resumable

  const checkCompleted = (entity: any | undefined) => {
    if (!entity) return false; // entity missing (likely archived) → non-resumable

    const isCompleted =
      (typeof entity.is_completed === "boolean" && entity.is_completed) ||
      (typeof entity.isCompleted === "boolean" && entity.isCompleted);

    const isArchived =
      (typeof entity.is_archived === "boolean" && entity.is_archived) ||
      (typeof entity.isArchived === "boolean" && entity.isArchived) ||
      !!entity.archived_at ||
      !!entity.archivedAt;

    if (isCompleted || isArchived) return false;

    return true;
  };

  if (p.taskId) {
    const t = maps.tasksById.get(p.taskId);
    return checkCompleted(t);
  }
  if (p.milestoneId) {
    const m = maps.milestonesById.get(p.milestoneId);
    return checkCompleted(m);
  }
  if (p.projectId) {
    const pr = maps.projectsById.get(p.projectId);
    return checkCompleted(pr);
  }
  if (p.goalId) {
    const g = maps.goalsById.get(p.goalId);
    return checkCompleted(g);
  }

  // mode-level entry – nothing to "complete"
  return true;
}
function getMetaFromPath(
  item: ActiveTimerDTO | TimeEntryDTO | null,
  maps: {
    modesById: Map<number, Mode>;
    goalsById: Map<number, Goal>;
    projectsById: Map<number, Project>;
    milestonesById: Map<number, Milestone>;
    tasksById: Map<number, Task>;
  },
  deriveModeId: (e: ActiveTimerDTO | TimeEntryDTO) => number | null
): {
  title: string;
  color: string;
  type: "task" | "milestone" | "project" | "goal" | "mode";
} {
  if (!item || !(item as any).path) {
    return { title: "", color: "#E5E7EB", type: "mode" };
  }

  const path: any = (item as any).path;
  const anyItem = item as any;

  // Snapshots as exposed by TimeEntrySerializer
  const snapshots = {
    task: anyItem.taskTitle ?? null,
    milestone: anyItem.milestoneTitle ?? null,
    project: anyItem.projectTitle ?? null,
    goal: anyItem.goalTitle ?? null,
    mode: anyItem.modeTitle ?? null,
  };

  if (path.taskId) {
    const t = maps.tasksById.get(path.taskId);
    if (t) {
      return withModeColor(t.title, deriveModeId(item), maps, "task");
    }
    const title = snapshots.task || "Completed task";
    return withModeColor(title, deriveModeId(item), maps, "task");
  }

  if (path.milestoneId) {
    const m = maps.milestonesById.get(path.milestoneId);
    if (m) {
      return withModeColor(m.title, deriveModeId(item), maps, "milestone");
    }
    const title = snapshots.milestone || "Completed milestone";
    return withModeColor(title, deriveModeId(item), maps, "milestone");
  }

  if (path.projectId) {
    const p = maps.projectsById.get(path.projectId);
    if (p) {
      return withModeColor(p.title, deriveModeId(item), maps, "project");
    }
    const title = snapshots.project || "Completed project";
    return withModeColor(title, deriveModeId(item), maps, "project");
  }

  if (path.goalId) {
    const g = maps.goalsById.get(path.goalId);
    if (g) {
      return withModeColor(g.title, deriveModeId(item), maps, "goal");
    }
    const title = snapshots.goal || "Completed goal";
    return withModeColor(title, deriveModeId(item), maps, "goal");
  }

  const modeId = deriveModeId(item);
  const mod = modeId != null ? maps.modesById.get(modeId) : undefined;
  const modeTitle = snapshots.mode || (mod ? mod.title : "Unknown Mode");

  return {
    title: modeTitle,
    color: mod?.color ?? "#9CA3AF",
    type: "mode",
  };
}

function withModeColor(
  title: string,
  modeId: number | null,
  maps: { modesById: Map<number, Mode> },
  type: "task" | "milestone" | "project" | "goal" | "mode"
) {
  const mod = modeId != null ? maps.modesById.get(modeId) : undefined;
  return { title, color: mod?.color ?? "#9CA3AF", type };
}

function getEntityIcon(
  type: "task" | "milestone" | "project" | "goal" | "mode",
  modeColor: string
) {
  switch (type) {
    case "task":
      return (
        <span
          className="inline-block w-3.5 h-3.5 rounded-full"
          style={{ backgroundColor: modeColor }}
        />
      );
    case "milestone":
      return (
        <span
          className="triangle"
          style={{
            borderTopColor: modeColor,
            borderTopWidth: 10,
            borderLeftWidth: 6,
            borderRightWidth: 6,
          }}
        />
      );
    case "project":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={modeColor}
          className="w-4 h-4"
        >
          <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h5.379a1.5 1.5 0 0 1 1.06.44l1.621 1.62H19.5A1.5 1.5 0 0 1 21 6.56V18a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18V4.5Z" />
        </svg>
      );
    case "goal":
      return (
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: modeColor }}
        >
          <TargetIcon className="w-3.5 h-3.5 text-white" />
        </div>
      );
    case "mode":
    default:
      return (
        <div className="w-3.5 h-3.5" style={{ backgroundColor: modeColor }} />
      );
  }
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function fmtSeconds(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m || !h) parts.push(`${m}m`);
  return parts.join(" ");
}
function formatRange(startISO: string, endISO?: string | null) {
  const s = new Date(startISO);
  const e = endISO ? new Date(endISO) : new Date();
  const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${hhmm(s)}–${endISO ? hhmm(e) : "now"}`;
}
