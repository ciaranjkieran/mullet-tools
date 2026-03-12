import { Task } from "../../types/Task";

// Accept either casing from the API (safe during transition)
export const mapTaskFromApi = (data: any): Task => ({
  id: data.id,
  title: data.title,
  modeId: data.modeId ?? data.mode_id,

  dueDate: data.dueDate ?? data.due_date ?? null,
  dueTime: data.dueTime ?? data.due_time ?? null,
  isCompleted: data.isCompleted ?? data.is_completed ?? false,
  position: data.position ?? 0,

  milestoneId: data.milestoneId ?? data.milestone_id ?? null,
  projectId: data.projectId ?? data.project_id ?? null,
  goalId: data.goalId ?? data.goal_id ?? null,

  assignedToId: data.assignedToId ?? data.assigned_to_id ?? null,
  assignee: data.assignee ?? null,
});

// PATCH-only mapper: include a key iff caller provided it.
// - Use `null` to intentionally clear a value.
// - Omit to leave it unchanged.
export function mapTaskToApi(task: Partial<Task>) {
  const out: Record<string, any> = {};

  // Scalars
  if ("title" in task) out.title = task.title;
  if ("modeId" in task) out.modeId = task.modeId;
  if ("isCompleted" in task) out.isCompleted = task.isCompleted;

  // Dates/times: include only if present; blank -> null to clear
  if ("dueDate" in task) {
    const d = task.dueDate;
    out.dueDate = d && d.trim() !== "" ? d : null;
  }
  if ("dueTime" in task) {
    const t = task.dueTime;
    if (t && t.trim() !== "") {
      out.dueTime = t.length === 5 ? `${t}:00` : t;
    } else {
      out.dueTime = null; // explicit clear
    }
  }

  // Parents: a task may belong to at most ONE of milestone / project / goal.
  // Most-specific wins: milestone > project > goal; the others are nulled out.
  const hasM = "milestoneId" in task && task.milestoneId !== undefined;
  const hasP = "projectId" in task && task.projectId !== undefined;
  const hasG = "goalId" in task && task.goalId !== undefined;

  if (hasM || hasP || hasG) {
    const m = hasM ? (task.milestoneId ?? null) : null;
    const p = hasP ? (task.projectId ?? null) : null;
    const g = hasG ? (task.goalId ?? null) : null;

    if (m !== null) {
      out.milestoneId = m;
      out.projectId = null;
      out.goalId = null;
    } else if (p !== null) {
      out.milestoneId = null;
      out.projectId = p;
      out.goalId = null;
    } else if (g !== null) {
      out.milestoneId = null;
      out.projectId = null;
      out.goalId = g;
    } else {
      // All were explicitly set to null — clear everything
      if (hasM) out.milestoneId = null;
      if (hasP) out.projectId = null;
      if (hasG) out.goalId = null;
    }
  }

  // position is server-controlled for container moves; include only if you mean to set it
  if ("position" in task && task.position !== undefined) {
    out.position = task.position;
  }

  if ("assignedToId" in task) out.assignedToId = task.assignedToId ?? null;

  return out;
}
