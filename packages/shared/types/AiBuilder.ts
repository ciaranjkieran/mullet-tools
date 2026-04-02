export type BuilderNodeType = "goal" | "project" | "milestone" | "task";
export type BuilderNodeOp = "create" | "update" | "delete" | "noop";

export type BuilderNode = {
  tempId: string;
  id?: number | null; // real DB id — present for update/delete/noop
  op: BuilderNodeOp;
  type: BuilderNodeType;
  title: string;
  description: string | null;
  comment: string | null;
  dueDate: string | null;
  parentTempId: string | null;
  children: BuilderNode[];
  included: boolean; // frontend-only: checkbox state for commit
  modeId?: number | null; // populated by Claude in All-mode
};

export type ExistingEntity = {
  id: number;
  type: BuilderNodeType;
  title: string;
  dueDate: string | null;
  parentId?: number | null;
  goalId?: number | null;
  projectId?: number | null;
  milestoneId?: number | null;
  modeId?: number | null; // included in All-mode snapshots
};

export type ModeDescriptor = {
  id: number;
  title: string;
  color: string;
};

export type AiBuildRequest = {
  prompt: string;
  modeId: number | "all";
  currentNodes?: BuilderNode[];
  entities?: ExistingEntity[];
  modes?: ModeDescriptor[]; // sent in All-mode so Claude knows available modes
};

export type AiBuildResponse = {
  summary: string;
  nodes: BuilderNode[];
};

export type AiCommitRequest = {
  modeId: number | "all";
  nodes: BuilderNode[];
};

export type AiCommitResponse = {
  created: {
    goals: number;
    projects: number;
    milestones: number;
    tasks: number;
  };
  updated: {
    goals: number;
    projects: number;
    milestones: number;
    tasks: number;
  };
  deleted: {
    goals: number;
    projects: number;
    milestones: number;
    tasks: number;
  };
};
