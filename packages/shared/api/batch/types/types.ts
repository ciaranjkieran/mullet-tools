export type EntityKind = "task" | "milestone" | "project" | "goal";
export type ParentType = "milestone" | "project" | "goal";

export type SelectedIds = {
  task: number[];
  milestone: number[];
  project: number[];
  goal: number[];
};

export type SelectedSets = {
  task: Set<number>;
  milestone: Set<number>;
  project: Set<number>;
  goal: Set<number>;
};

export function toSelectedIds(selected: SelectedSets): SelectedIds {
  return {
    task: [...selected.task],
    milestone: [...selected.milestone],
    project: [...selected.project],
    goal: [...selected.goal],
  };
}
