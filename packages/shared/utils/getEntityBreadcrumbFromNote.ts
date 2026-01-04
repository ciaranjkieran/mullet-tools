import { Note } from "@shared/types/Note";
import { getEntityBreadcrumb, Maps } from "./getEntityBreadcrumb";

type BreadcrumbOptions = {
  immediateOnly?: boolean;
};

export function getEntityBreadcrumbFromNote(
  note: Note,
  maps: Maps,
  options: BreadcrumbOptions = {}
): string {
  const { content_type, object_id, entityTitle } = note;

  const type = content_type
    ?.toLowerCase()
    .replace(/^core\s*\|\s*/i, "")
    .trim();

  if (!object_id || !type) return "";

  const lookups = {
    task: maps.taskMap?.[object_id],
    milestone: maps.milestoneMap?.[object_id],
    project: maps.projectMap?.[object_id],
    goal: maps.goalMap?.[object_id],
  };

  const entity = lookups[type as keyof typeof lookups];

  // Fallback to saved entityTitle if the live entity is missing
  if (!entity) {
    return type === "mode" ? "" : entityTitle ?? "";
  }

  return getEntityBreadcrumb(entity, maps, options);
}
