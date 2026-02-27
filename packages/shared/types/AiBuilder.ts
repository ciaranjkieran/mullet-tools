export type BuilderNodeType = "goal" | "project" | "milestone" | "task";

export type BuilderNode = {
  tempId: string;
  type: BuilderNodeType;
  title: string;
  description: string | null;
  comment: string | null;
  dueDate: string | null;
  parentTempId: string | null;
  children: BuilderNode[];
  included: boolean; // frontend-only: checkbox state for commit
};

export type AiBuildRequest = {
  prompt: string;
  modeId: number;
  history: { role: "user" | "assistant"; content: string }[];
};

export type AiBuildResponse = {
  summary: string;
  nodes: BuilderNode[];
};

export type AiCommitRequest = {
  modeId: number;
  nodes: BuilderNode[];
};

export type AiCommitResponse = {
  created: {
    goals: number;
    projects: number;
    milestones: number;
    tasks: number;
  };
};
