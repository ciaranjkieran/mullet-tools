export type Task = {
  id: number;
  title: string;
  isCompleted: boolean;
  dueDate?: string | null;
  dueTime?: string | null;
  position: number;

  milestoneId?: number | null;
  projectId?: number | null;
  goalId?: number | null;
  modeId: number;
};
