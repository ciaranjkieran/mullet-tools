import { TemplateProjectData, TemplateMilestoneData } from "../types/Template";

// -----------------------------
// 🔹 Task Management
// -----------------------------

export function updateTask(
  node: TemplateProjectData,
  index: number,
  value: string
): TemplateProjectData {
  const newNode = { ...node };
  newNode.tasks = [...newNode.tasks];
  newNode.tasks[index] = value;
  return newNode;
}

export function addTask(node: TemplateProjectData): TemplateProjectData {
  return { ...node, tasks: [...(node.tasks || []), ""] };
}

export function removeTask(
  node: TemplateProjectData,
  index: number
): TemplateProjectData {
  return { ...node, tasks: node.tasks.filter((_, i) => i !== index) };
}

// -----------------------------
// 🔹 Sub‑Project Management
// -----------------------------

export function addSubProject(node: TemplateProjectData): TemplateProjectData {
  return {
    ...node,
    subProjects: [
      ...(node.subProjects || []),
      {
        title: "",
        description: "",
        tasks: [],
        subProjects: [],
        subMilestones: [],
      },
    ],
  };
}

export function updateSubProject(
  node: TemplateProjectData,
  index: number,
  newSub: TemplateProjectData
): TemplateProjectData {
  const newNode = { ...node };
  newNode.subProjects = [...newNode.subProjects];
  newNode.subProjects[index] = newSub;
  return newNode;
}

export function removeSubProject(
  node: TemplateProjectData,
  index: number
): TemplateProjectData {
  return {
    ...node,
    subProjects: node.subProjects.filter((_, i) => i !== index),
  };
}

// -----------------------------
// 🔹 Milestone Management in Projects
// -----------------------------

export function addMilestone(node: TemplateProjectData): TemplateProjectData {
  return {
    ...node,
    subMilestones: [
      ...(node.subMilestones || []),
      { title: "", tasks: [], subMilestones: [] },
    ],
  };
}

export function updateMilestone(
  node: TemplateProjectData,
  index: number,
  newMilestone: TemplateMilestoneData
): TemplateProjectData {
  const newNode = { ...node };
  newNode.subMilestones = [...newNode.subMilestones];
  newNode.subMilestones[index] = newMilestone;
  return newNode;
}

export function removeMilestone(
  node: TemplateProjectData,
  index: number
): TemplateProjectData {
  return {
    ...node,
    subMilestones: node.subMilestones.filter((_, i) => i !== index),
  };
}
