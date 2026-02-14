"use client";

import { useMemo, useState, useEffect } from "react";
import GoalIcon from "../../entities/goals/UI/GoalIcon";
import GoalTarget from "../../entities/goals/UI/GoalTarget";
import { getContrastingText } from "@shared/utils/getContrastingText";
import type React from "react";

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

type PathLike = {
  modeId?: number | null;
  goalId?: number | null;
  projectId?: number | null;
  milestoneId?: number | null;
  taskId?: number | null;
} | null;

type EntryLike = TimeEntryDTO | ActiveTimerDTO;

type EntrySnapshots = {
  taskTitle?: string | null;
  milestoneTitle?: string | null;
  projectTitle?: string | null;
  goalTitle?: string | null;
  modeTitle?: string | null;
};

type PlannedSecondsLike = {
  plannedSeconds?: number | null;
};

function getPath(e: EntryLike): PathLike {
  // DTOs don't expose `path` in the TS type (or it's too loose),
  // so we read it safely from an unknown record.
  const rec = e as unknown as Record<string, unknown>;
  const p = rec["path"] as unknown;

  if (!p || typeof p !== "object") return null;

  const po = p as Record<string, unknown>;
  const toNumOrNull = (v: unknown): number | null =>
    typeof v === "number" ? v : v == null ? null : null;

  return {
    modeId: toNumOrNull(po["modeId"]),
    goalId: toNumOrNull(po["goalId"]),
    projectId: toNumOrNull(po["projectId"]),
    milestoneId: toNumOrNull(po["milestoneId"]),
    taskId: toNumOrNull(po["taskId"]),
  };
}

function getSnapshots(e: EntryLike): EntrySnapshots {
  const rec = e as unknown as Record<string, unknown>;
  const toStrOrNull = (v: unknown): string | null =>
    typeof v === "string" ? v : null;

  return {
    taskTitle: toStrOrNull(rec["taskTitle"]),
    milestoneTitle: toStrOrNull(rec["milestoneTitle"]),
    projectTitle: toStrOrNull(rec["projectTitle"]),
    goalTitle: toStrOrNull(rec["goalTitle"]),
    modeTitle: toStrOrNull(rec["modeTitle"]),
  };
}

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
    [modes, tasks, milestones, projects, goals],
  );

  const deriveModeId = useMemo(() => {
    return (e: EntryLike): number | null => {
      const p = getPath(e);
      if (!p) return null;

      if (p.modeId != null) return p.modeId;

      if (p.taskId != null) return maps.tasksById.get(p.taskId)?.modeId ?? null;
      if (p.milestoneId != null)
        return maps.milestonesById.get(p.milestoneId)?.modeId ?? null;
      if (p.projectId != null)
        return maps.projectsById.get(p.projectId)?.modeId ?? null;
      if (p.goalId != null) return maps.goalsById.get(p.goalId)?.modeId ?? null;

      return null;
    };
  }, [maps]);

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
  }, [entries, filterModeId, now, deriveModeId]);

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
      <li
        key={e.id}
        className="flex items-start md:items-center justify-between gap-2 md:gap-4"
      >
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {getEntityIcon(meta.type, meta.color)}
          <div className="truncate">
            <div className="text-xs md:text-sm font-medium truncate">
              {meta.title || "Untitled"}
            </div>
            <div className="text-[10px] md:text-xs text-gray-500">
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

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-1.5 md:gap-2">
          {canResume && (
            <button
              onClick={() => {
                if (!canResume) return;
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
              style={
                {
                  ["--btn"]: meta.color,
                  ["--btnText"]: getContrastingText(meta.color),
                } as React.CSSProperties
              }
              className={`px-2.5 py-1.5 md:px-3 rounded-md text-[11px] md:text-xs font-semibold transition
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
            className={`px-2.5 py-1.5 md:px-3 rounded-md text-[11px] md:text-xs font-semibold transition
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
      className="rounded-2xl border-2 p-4 md:p-6"
      style={{ borderColor: modeColor }}
    >
      <h3 className="text-base md:text-lg font-semibold mb-1">
        Today & Yesterday
      </h3>
      <p className="text-[10px] md:text-xs text-gray-500 mb-3 md:mb-4">
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
  nowMs?: number,
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
  const rec = e as unknown as PlannedSecondsLike;
  const plannedFromEntry = rec.plannedSeconds;
  return typeof plannedFromEntry === "number" ? plannedFromEntry : null;
}

function getRemainingSeconds(
  e: TimeEntryDTO,
  resolvePlannedSeconds?: (entry: TimeEntryDTO) => number | null,
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
  },
): boolean {
  const p = getPath(e);
  if (!p) return true; // mode-only / floating entry → still resumable

  const checkCompleted = (entity: unknown) => {
    if (!entity) return false;

    const rec = entity as Record<string, unknown>;

    const isCompleted =
      (typeof rec["is_completed"] === "boolean" && rec["is_completed"]) ||
      (typeof rec["isCompleted"] === "boolean" && rec["isCompleted"]);

    const isArchived =
      (typeof rec["is_archived"] === "boolean" && rec["is_archived"]) ||
      (typeof rec["isArchived"] === "boolean" && rec["isArchived"]) ||
      Boolean(rec["archived_at"]) ||
      Boolean(rec["archivedAt"]);

    return !(isCompleted || isArchived);
  };

  if (p.taskId != null) {
    const t = maps.tasksById.get(p.taskId);
    return checkCompleted(t);
  }
  if (p.milestoneId != null) {
    const m = maps.milestonesById.get(p.milestoneId);
    return checkCompleted(m);
  }
  if (p.projectId != null) {
    const pr = maps.projectsById.get(p.projectId);
    return checkCompleted(pr);
  }
  if (p.goalId != null) {
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
  deriveModeId: (e: ActiveTimerDTO | TimeEntryDTO) => number | null,
): {
  title: string;
  color: string;
  type: "task" | "milestone" | "project" | "goal" | "mode";
} {
  if (!item) {
    return { title: "", color: "#E5E7EB", type: "mode" };
  }

  const path = getPath(item);
  if (!path) {
    return { title: "", color: "#E5E7EB", type: "mode" };
  }

  // Snapshot titles (may be present even if entity no longer exists)
  const s = getSnapshots(item);
  const snapshots = {
    task: s.taskTitle ?? null,
    milestone: s.milestoneTitle ?? null,
    project: s.projectTitle ?? null,
    goal: s.goalTitle ?? null,
    mode: s.modeTitle ?? null,
  };

  if (path.taskId != null) {
    const t = maps.tasksById.get(path.taskId);
    if (t) return withModeColor(t.title, deriveModeId(item), maps, "task");

    const title = snapshots.task || "Completed task";
    return withModeColor(title, deriveModeId(item), maps, "task");
  }

  if (path.milestoneId != null) {
    const m = maps.milestonesById.get(path.milestoneId);
    if (m) return withModeColor(m.title, deriveModeId(item), maps, "milestone");

    const title = snapshots.milestone || "Completed milestone";
    return withModeColor(title, deriveModeId(item), maps, "milestone");
  }

  if (path.projectId != null) {
    const p = maps.projectsById.get(path.projectId);
    if (p) return withModeColor(p.title, deriveModeId(item), maps, "project");

    const title = snapshots.project || "Completed project";
    return withModeColor(title, deriveModeId(item), maps, "project");
  }

  if (path.goalId != null) {
    const g = maps.goalsById.get(path.goalId);
    if (g) return withModeColor(g.title, deriveModeId(item), maps, "goal");

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
  type: "task" | "milestone" | "project" | "goal" | "mode",
) {
  const mod = modeId != null ? maps.modesById.get(modeId) : undefined;
  return { title, color: mod?.color ?? "#9CA3AF", type };
}

function getEntityIcon(
  type: "task" | "milestone" | "project" | "goal" | "mode",
  modeColor: string,
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
          viewBox="0 28 28"
          fill={modeColor}
          className="w-5 h-5"
        >
          <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h5.379a1.5 1.5 0 0 1 1.06.44l1.621 1.62H19.5A1.5 1.5 0 0 1 21 6.56V18a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18V4.5Z" />
        </svg>
      );
    case "goal":
      return (
        <div
          className="w-5 h-5 shrink-0 aspect-square rounded-full flex items-center justify-center"
          style={{ backgroundColor: modeColor }}
        >
          <GoalIcon size={13} className="text-white">
            <GoalTarget />
          </GoalIcon>
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
