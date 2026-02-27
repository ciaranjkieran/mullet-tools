import { Milestone } from "../../types/Milestone";

/** Read: accept both camelCase and snake_case for safety */
export const mapMilestoneFromApi = (data: any): Milestone => ({
  id: data.id,
  title: data.title,
  modeId: data.modeId ?? data.mode_id ?? null,
  position: data.position ?? 0,

  isCompleted: data.isCompleted ?? data.is_completed ?? false,
  dueDate: data.dueDate ?? data.due_date ?? null,
  dueTime: data.dueTime ?? data.due_time ?? null,

  parentId: data.parentId ?? data.parent_id ?? null,
  projectId: data.projectId ?? data.project_id ?? null,
  goalId: data.goalId ?? data.goal_id ?? null,

  assignedToId: data.assignedToId ?? data.assigned_to_id ?? null,
  assignee: data.assignee ?? null,
});

/** Write (PATCH-only): only include keys you intend to change. */
export function mapMilestoneToApi(milestone: Partial<Milestone>) {
  const out: Record<string, any> = {};

  if ("title" in milestone) out.title = milestone.title;
  if ("modeId" in milestone) out.modeId = milestone.modeId;
  if ("isCompleted" in milestone) out.isCompleted = milestone.isCompleted;

  if ("dueDate" in milestone) {
    const d = milestone.dueDate;
    out.dueDate = d && d.trim() !== "" ? d : null;
  }
  if ("dueTime" in milestone) {
    const t = milestone.dueTime;
    if (t && t.trim() !== "") {
      out.dueTime = t.length === 5 ? `${t}:00` : t;
    } else {
      out.dueTime = null;
    }
  }

  // Parents: include only if explicitly provided (number or null)
  if ("parentId" in milestone && milestone.parentId !== undefined) {
    out.parentId = milestone.parentId;
  }
  if ("projectId" in milestone && milestone.projectId !== undefined) {
    out.projectId = milestone.projectId;
  }
  if ("goalId" in milestone && milestone.goalId !== undefined) {
    out.goalId = milestone.goalId;
  }

  if ("position" in milestone && milestone.position !== undefined) {
    out.position = milestone.position;
  }

  if ("assignedToId" in milestone) out.assignedToId = milestone.assignedToId ?? null;

  return out;
}
