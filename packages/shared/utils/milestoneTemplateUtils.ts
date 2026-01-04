import { Template } from "../types/Template";

import { TemplateMilestoneData } from "@shared/types/Template";

// ✅ Update a task
export function updateTask(
  node: TemplateMilestoneData,
  index: number,
  value: string
) {
  const newNode = { ...node };
  newNode.tasks = [...newNode.tasks];
  newNode.tasks[index] = value;
  return newNode;
}

// ✅ Add a task
export function addTask(node: TemplateMilestoneData) {
  return { ...node, tasks: [...node.tasks, ""] };
}

// ✅ Remove a task
export function removeTask(node: TemplateMilestoneData, index: number) {
  return { ...node, tasks: node.tasks.filter((_, i) => i !== index) };
}

// ✅ Add a sub‑milestone
export function addSubMilestone(node: TemplateMilestoneData) {
  return {
    ...node,
    subMilestones: [
      ...node.subMilestones,
      { title: "", tasks: [], subMilestones: [] },
    ],
  };
}

// ✅ Update a sub‑milestone
export function updateSubMilestone(
  node: TemplateMilestoneData,
  index: number,
  newSub: TemplateMilestoneData
) {
  const newNode = { ...node };
  newNode.subMilestones = [...newNode.subMilestones];
  newNode.subMilestones[index] = newSub;
  return newNode;
}

// ✅ Remove a sub‑milestone
export function removeSubMilestone(node: TemplateMilestoneData, index: number) {
  return {
    ...node,
    subMilestones: node.subMilestones.filter((_, i) => i !== index),
  };
}
