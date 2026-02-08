export type EntityType = "mode" | "task" | "milestone" | "project" | "goal";

export const rawToEntityType = (v: unknown): EntityType | null => {
  if (typeof v !== "string") return null;

  const lower = v.toLowerCase();

  if (lower.includes("task")) return "task";
  if (lower.includes("milestone")) return "milestone";
  if (lower.includes("project")) return "project";
  if (lower.includes("goal")) return "goal";
  if (lower.includes("mode")) return "mode";

  return null;
};
