import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import { Goal } from "@shared/types/Goal";
import { Project } from "@shared/types/Project";
import { Milestone } from "@shared/types/Milestone";

export function buildLookups({
  modes,
  tasks,
  goals,
  projects,
  milestones,
}: {
  modes: Mode[];
  tasks: Task[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
}) {
  return {
    modeById: new Map(modes.map((m) => [m.id, m])),
    taskById: new Map(tasks.map((t) => [t.id, t])),
    goalById: new Map(goals.map((g) => [g.id, g])),
    projectById: new Map(projects.map((p) => [p.id, p])),
    milestoneById: new Map(milestones.map((m) => [m.id, m])),
  };
}
