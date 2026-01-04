// @shared/types/timer.ts

/** Stopwatch keeps counting up; Timer counts down from a planned duration. */
export type Kind = "stopwatch" | "timer";

/** UUID (string) assigned per intent; all resumed bursts share this id. */
export type SessionId = string;

/** Concrete lineage of the thing being timed. */
export type SlotPath = {
  /** Usually present, but allow null to be robust with legacy rows. */
  modeId: number | null;
  goalId?: number | null;
  projectId?: number | null;
  milestoneId?: number | null;
  taskId?: number | null;
};

/** The currently active timer (if any). */
export type ActiveTimerDTO = {
  kind: Kind;
  startedAt: string; // ISO
  endsAt: string | null; // ISO | null
  path: SlotPath;
  /** NEW: session grouping key (present when resumable) */
  sessionId?: SessionId | null;
  /** NEW: original plan for countdowns (seconds). Null for stopwatches. */
  plannedSeconds?: number | null;
};

/** A closed burst of work, produced whenever an active timer stops/expires. */
export type TimeEntryDTO = {
  id: number;
  kind: Kind;
  startedAt: string; // ISO
  endedAt: string; // ISO
  seconds: number;
  note: string;
  path: SlotPath;
  /** NEW: session grouping key (same across resumes of the same intent) */
  sessionId?: SessionId | null;
  /** NEW: original plan for countdowns (seconds). Null/absent for stopwatches. */
  plannedSeconds?: number | null;
};

/** Payload to start or resume timing. */
export type StartTimerPayload =
  | {
      /** NEW: Resume from an existing entry (server infers session, path, remaining). */
      resumeFromEntryId: number;
    }
  | {
      /** Fresh start (stopwatch or timer). */
      kind: Kind;
      /** Only used when kind === "timer". */
      durationSec?: number;
      /** Deepest-known id; server resolves the rest upward. All optional except at least one must be provided. */
      taskId?: number;
      milestoneId?: number;
      projectId?: number;
      goalId?: number;
      modeId?: number;
    }
  | {
      /** Fresh start with a fully specified path you already have on hand. */
      kind: Kind;
      /** Only used when kind === "timer". */
      durationSec?: number;
      path: SlotPath;
    };

/** (Optional) UI-only helper if you keep a callback signature that used to pass remainingSeconds. */
export type ResumeFromEntryOpts = {
  /** UI hint only; backend now computes truth. */
  remainingSeconds?: number;
};
