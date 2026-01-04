export type Project = {
  id: number;
  title: string;
  description?: string | null;
  position: number;
  isCompleted: boolean;

  dueDate?: string | null;
  dueTime?: string | null;

  parentId?: number | null;
  goalId?: number | null;
  modeId: number;
};
