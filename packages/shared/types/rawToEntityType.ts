export type EntityType = "mode" | "task" | "milestone" | "project" | "goal";

export const rawToEntityType = (v: unknown): EntityType | null => {
  // Numeric ContentType IDs (adjust to your backend mappings)
  if (typeof v === "number") {
    const numericMap: Record<number, EntityType> = {
      1: "mode",
      2: "task",
      3: "milestone",
      11: "project",
      12: "goal",
    };
    return numericMap[v] ?? null;
  }

  if (typeof v !== "string") return null;

  const lower = v.toLowerCase();

  if (lower.includes("task")) return "task";
  if (lower.includes("milestone")) return "milestone";
  if (lower.includes("project")) return "project";
  if (lower.includes("goal")) return "goal";
  if (lower.includes("mode")) return "mode";

  return null;
};
