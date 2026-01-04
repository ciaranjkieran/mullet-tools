import { Project } from "@shared/types/Project";

export type NestedProject = Project & { children: NestedProject[] };

export function buildProjectTree(
  projects: Project[],
  parentId: number | null = null
): NestedProject[] {
  return projects
    .filter((p) => p.parentId === parentId)
    .sort((a, b) => a.position - b.position)
    .map((project) => ({
      ...project,
      children: buildProjectTree(projects, project.id),
    }));
}
