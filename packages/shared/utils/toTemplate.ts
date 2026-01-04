// @shared/utils/toTemplate.ts
import { Task } from "../../shared/types/Task";
import { Milestone } from "../../shared/types/Milestone";
import { Project } from "../../shared/types/Project";
import {
  TemplateMilestoneData,
  TemplateProjectData,
} from "../../shared/types/Template";

// ---- Milestone → TemplateMilestoneData (with recursive children)
export function milestoneToTemplateData(
  root: Milestone,
  allMilestones: Milestone[],
  allTasks: Task[]
): TemplateMilestoneData {
  const tasksFor = (milestoneId: number) =>
    allTasks
      .filter((t) => t.milestoneId === milestoneId)
      .map((t) => t.title || "");

  const children = allMilestones.filter((m) => m.parentId === root.id);

  return {
    title: root.title || "",
    tasks: tasksFor(root.id),
    subMilestones: children.map((child) =>
      milestoneToTemplateData(child, allMilestones, allTasks)
    ),
  };
}

// ---- Project → TemplateProjectData (with recursive subprojects + milestone trees)
export function projectToTemplateData(
  root: Project,
  allProjects: Project[],
  allMilestones: Milestone[],
  allTasks: Task[]
): TemplateProjectData {
  const tasksFor = (projectId: number) =>
    allTasks
      .filter((t) => t.projectId === projectId && !t.milestoneId)
      .map((t) => t.title || "");

  const subProjects = allProjects.filter((p) => p.parentId === root.id);
  const projectMilestones = allMilestones.filter(
    (m) => m.projectId === root.id && !m.parentId
  );

  return {
    title: root.title || "",
    description: root.description || "",
    tasks: tasksFor(root.id),
    subMilestones: projectMilestones.map((m) =>
      milestoneToTemplateData(m, allMilestones, allTasks)
    ),
    subProjects: subProjects.map((sp) =>
      projectToTemplateData(sp, allProjects, allMilestones, allTasks)
    ),
  };
}
