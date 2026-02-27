import type { Assignee } from "./Assignee";

export type Milestone = {
  id: number;
  title: string;
  isCompleted: boolean;
  dueDate: string | null;
  dueTime?: string | null;

  position: number;

  parentId: number | null;
  projectId: number | null;
  goalId?: number | null;
  modeId: number;

  assignedToId?: number | null;
  assignee?: Assignee | null;
};
