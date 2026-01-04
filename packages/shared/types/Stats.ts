// @shared/types/Stats.ts

export type StatsNode = {
  id: number;
  title: string;
  selfSeconds: number;
  seconds: number;
  goals: StatsNode[];
  projects: StatsNode[];
  milestones: StatsNode[];
  tasks: StatsNode[];
};

export type StatsTree = {
  modeId: number;
  selfSeconds: number;
  seconds: number;
  goals: StatsNode[];
  projects: StatsNode[];
  milestones: StatsNode[];
  tasks: StatsNode[];
};

export type EntityKind = "goal" | "project" | "milestone" | "task";

export type StatsEntryPath = {
  modeId: number | null;
  goalId: number | null;
  projectId: number | null;
  milestoneId: number | null;
  taskId: number | null;
};

export type EntityStatsEntry = {
  id: number;
  startedAt: string;
  endedAt: string;
  seconds: number;
  path: StatsEntryPath;
  note?: string | null;
};

export type EntityStatsChildren = {
  // For a goal this might have projects/milestones/tasks,
  // for a project just milestones/tasks, etc.
  goals?: StatsNode[];
  projects?: StatsNode[];
  milestones?: StatsNode[];
  tasks?: StatsNode[];
};

export type EntityStats = {
  kind: EntityKind;
  id: number;
  title: string;
  modeId: number | null;
  seconds: number;
  selfSeconds: number;
  children: EntityStatsChildren;
  recentEntries: EntityStatsEntry[];
};
