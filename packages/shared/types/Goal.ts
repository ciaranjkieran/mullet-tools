import type { Assignee } from "./Assignee";

export type Goal = {
  id: number;
  title: string;
  modeId: number;

  description?: string | null;
  position: number;
  isCompleted: boolean;
  dueDate: string | null;
  dueTime?: string | null;

  assignedToId?: number | null;
  assignee?: Assignee | null;
};
