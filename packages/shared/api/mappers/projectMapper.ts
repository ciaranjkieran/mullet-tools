import { Project } from "../../types/Project";

// Read: accept both casings from API
export const mapProjectFromApi = (data: any): Project => ({
  id: data.id,
  title: data.title,
  description: data.description ?? null,
  position: data.position ?? 0,

  isCompleted: data.isCompleted ?? data.is_completed ?? false,
  dueDate: data.dueDate ?? data.due_date ?? null,
  dueTime: data.dueTime ?? data.due_time ?? null,

  parentId: data.parentId ?? data.parent_id ?? null,
  goalId: data.goalId ?? data.goal_id ?? null,
  modeId: data.modeId ?? data.mode_id,

  assignedToId: data.assignedToId ?? data.assigned_to_id ?? null,
  assignee: data.assignee ?? null,
});

// Write (PATCH-only): include only provided keys; parents only when explicit.
export function mapProjectToApi(project: Partial<Project>) {
  const out: Record<string, any> = {};

  if ("title" in project) out.title = project.title;

  if ("description" in project) {
    const d = project.description;
    out.description = d === "" ? null : d;
  }

  if ("modeId" in project) out.modeId = project.modeId;
  if ("isCompleted" in project) out.isCompleted = project.isCompleted;

  if ("dueDate" in project) {
    const d = project.dueDate;
    out.dueDate = d && d.trim() !== "" ? d : null;
  }
  if ("dueTime" in project) {
    const t = project.dueTime;
    if (t && t.trim() !== "") {
      out.dueTime = t.length === 5 ? `${t}:00` : t;
    } else {
      out.dueTime = null;
    }
  }

  // Parents: only include when explicitly provided (number or null)
  if ("parentId" in project && project.parentId !== undefined) {
    out.parentId = project.parentId;
  }
  if ("goalId" in project && project.goalId !== undefined) {
    out.goalId = project.goalId;
  }

  if ("position" in project && project.position !== undefined) {
    out.position = project.position;
  }

  if ("assignedToId" in project) out.assignedToId = project.assignedToId ?? null;

  return out;
}
