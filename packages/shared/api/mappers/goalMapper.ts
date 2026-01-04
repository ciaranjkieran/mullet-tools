import { Goal } from "../../types/Goal";

/** Read: accept both camelCase and snake_case */
export const mapGoalFromApi = (data: any): Goal => ({
  id: data.id,
  title: data.title,
  description: data.description ?? null,

  dueDate: data.dueDate ?? data.due_date ?? null,
  dueTime: data.dueTime ?? data.due_time ?? null,

  position: data.position ?? 0,
  isCompleted: data.isCompleted ?? data.is_completed ?? false,

  modeId: data.modeId ?? data.mode_id,
});

/** Write (PATCH-only): include a key iff caller provided it. */
export function mapGoalToApi(goal: Partial<Goal>) {
  const out: Record<string, any> = {};

  if ("title" in goal) out.title = goal.title;

  if ("description" in goal) {
    const d = goal.description;
    // allow clearing with empty string
    out.description = d === "" ? null : d;
  }

  if ("modeId" in goal) out.modeId = goal.modeId;
  if ("isCompleted" in goal) out.isCompleted = goal.isCompleted;

  // Dates/times: present => send; blank => null to clear
  if ("dueDate" in goal) {
    const d = goal.dueDate;
    out.dueDate = d && d.trim() !== "" ? d : null;
  }
  if ("dueTime" in goal) {
    const t = goal.dueTime;
    if (t && t.trim() !== "") {
      out.dueTime = t.length === 5 ? `${t}:00` : t;
    } else {
      out.dueTime = null;
    }
  }

  // position is server-controlled; only include if you truly intend to set it
  if ("position" in goal && goal.position !== undefined) {
    out.position = goal.position;
  }

  return out;
}
