export type Goal = {
  id: number;
  title: string;
  modeId: number;

  description?: string | null;
  position: number;
  isCompleted: boolean;
  dueDate: string | null;
  dueTime?: string | null;
};
