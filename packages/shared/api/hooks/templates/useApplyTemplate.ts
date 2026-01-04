// @shared/utils/useApplyTemplate.ts
import { useCreateMilestone } from "@shared/api/hooks/milestones/useCreateMilestone";
import { useCreateTask } from "@shared/api/hooks/tasks/useCreateTask";
import { useCreateProject } from "@shared/api/hooks/projects/useCreateProject";
import {
  Template,
  TemplateMilestoneData,
  TemplateProjectData,
} from "@shared/types/Template";
import { Project } from "@shared/types/Project";
import { Milestone } from "@shared/types/Milestone";

type Parent = { type: "project" | "milestone"; id: number; modeId: number };

export default function useApplyTemplate() {
  const createMilestone = useCreateMilestone();
  const createTask = useCreateTask();
  const createProject = useCreateProject();

  const createMilestoneRecursive = async (
    data: TemplateMilestoneData,
    modeId: number,
    parent?: Parent
  ): Promise<Milestone> => {
    const milestone = await createMilestone.mutateAsync(
      parent?.type === "project"
        ? {
            title: data.title || "Untitled Milestone",
            parentId: null,
            projectId: parent.id,
            goalId: null,
            dueDate: null,
            dueTime: null,
            modeId,
          }
        : {
            title: data.title || "Untitled Milestone",
            parentId: parent ? parent.id : null,
            projectId: null,
            goalId: null,
            dueDate: null,
            dueTime: null,
            modeId,
          }
    );

    if (data.tasks?.length) {
      for (const title of data.tasks) {
        if (!title?.trim()) continue;
        await createTask.mutateAsync({
          title,
          milestoneId: milestone.id,
          projectId: null,
          goalId: null,
          modeId,
          dueDate: null,
          dueTime: null,
        });
      }
    }

    if (data.subMilestones?.length) {
      for (const sub of data.subMilestones) {
        await createMilestoneRecursive(sub, modeId, {
          type: "milestone",
          id: milestone.id,
          modeId,
        });
      }
    }

    return milestone;
  };

  const createProjectRecursive = async (
    data: TemplateProjectData,
    modeId: number,
    parent?: { type: "project"; id: number }
  ): Promise<Project> => {
    const project = await createProject.mutateAsync({
      title: data.title || "Untitled Project",
      description: data.description || "",
      parentId: parent ? parent.id : null,
      goalId: null,
      dueDate: null,
      dueTime: null,
      modeId,
    });

    if (data.tasks?.length) {
      for (const title of data.tasks) {
        if (!title?.trim()) continue;
        await createTask.mutateAsync({
          title,
          projectId: project.id,
          milestoneId: null,
          goalId: null,
          modeId,
          dueDate: null,
          dueTime: null,
        });
      }
    }

    if (data.subMilestones?.length) {
      for (const m of data.subMilestones) {
        await createMilestoneRecursive(m, modeId, {
          type: "project",
          id: project.id,
          modeId,
        });
      }
    }

    if (data.subProjects?.length) {
      for (const sub of data.subProjects) {
        await createProjectRecursive(sub, modeId, {
          type: "project",
          id: project.id,
        });
      }
    }

    return project;
  };

  async function applyTemplate(
    tpl: Template,
    parent?: Parent
  ): Promise<Project | Milestone> {
    if (tpl.type === "project") {
      return await createProjectRecursive(
        tpl.data as TemplateProjectData,
        tpl.mode,
        undefined
      );
    }
    if (tpl.type === "milestone") {
      return await createMilestoneRecursive(
        tpl.data as TemplateMilestoneData,
        tpl.mode,
        parent
      );
    }
    throw new Error("Unsupported template type");
  }

  return { applyTemplate };
}
