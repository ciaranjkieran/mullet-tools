import { Goal } from "../types/Goal";
import { Project } from "../types/Project";
import { Milestone } from "../types/Milestone";
import { Task } from "../types/Task";

export type Maps = {
  goalsById: Record<number, Goal>;
  projectsById: Record<number, Project>;
  milestonesById: Record<number, Milestone>;
};

export function buildMaps(
  goals: Goal[],
  projects: Project[],
  milestones: Milestone[]
): Maps {
  const goalsById: Record<number, Goal> = {};
  const projectsById: Record<number, Project> = {};
  const milestonesById: Record<number, Milestone> = {};
  for (const g of goals) goalsById[g.id] = g;
  for (const p of projects) projectsById[p.id] = p;
  for (const m of milestones) milestonesById[m.id] = m;
  return { goalsById, projectsById, milestonesById };
}

function buildTimerMaps(
  goals: Goal[],
  projects: Project[],
  milestones: Milestone[],
  tasks: Task[]
) {
  const projectsByGoal = new Map<number, Project[]>();
  const milestonesByProject = new Map<number, Milestone[]>();
  const milestonesByGoal = new Map<number, Milestone[]>(); // if supported
  const tasksByMilestone = new Map<number, Task[]>();
  const tasksByProject = new Map<number, Task[]>();
  const tasksByGoal = new Map<number, Task[]>();
  const goalsByMode = new Map<number, Goal[]>();
  const projectsByMode = new Map<number, Project[]>();
  const milestonesByMode = new Map<number, Milestone[]>();
  const tasksByMode = new Map<number, Task[]>();

  const push = <T>(m: Map<number, T[]>, k: number | undefined | null, v: T) => {
    if (k == null) return;
    const arr = m.get(k) ?? [];
    arr.push(v);
    m.set(k, arr);
  };

  for (const g of goals) push(goalsByMode, g.modeId, g);
  for (const p of projects) {
    push(projectsByMode, p.modeId, p);
    push(projectsByGoal, p.goalId, p);
  }
  for (const m of milestones) {
    push(milestonesByMode, m.modeId, m);
    push(milestonesByProject, m.projectId, m);
    push(milestonesByGoal, m.goalId, m); // only if you model this
  }
  for (const t of tasks) {
    // whichever relationships you actually store on Task:
    // t.modeId, t.goalId, t.projectId, t.milestoneId
    push(tasksByMode, (t as any).modeId, t);
    push(tasksByGoal, (t as any).goalId, t);
    push(tasksByProject, (t as any).projectId, t);
    push(tasksByMilestone, (t as any).milestoneId, t);
  }

  return {
    goalsByMode,
    projectsByMode,
    milestonesByMode,
    tasksByMode,
    projectsByGoal,
    milestonesByProject,
    milestonesByGoal,
    tasksByMilestone,
    tasksByProject,
    tasksByGoal,
  };
}
