import { useUpdateProject } from "./useUpdateProject";
import { useQueryClient } from "@tanstack/react-query";
import { Project } from "../../../types/Project";

export function useUpdateProjectWithPropagation() {
  const queryClient = useQueryClient();
  const { mutateAsync: updateProjectAsync, ...rest } = useUpdateProject();

  function getDescendants(projects: Project[], parentId: number): Project[] {
    const descendants: Project[] = [];
    function walk(id: number) {
      const children = projects.filter((p) => p.parentId === id);
      for (const child of children) {
        descendants.push(child);
        walk(child.id);
      }
    }
    walk(parentId);
    return descendants;
  }

  async function mutateWithPropagation(
    input: Parameters<typeof updateProjectAsync>[0]
  ) {
    const projectsBefore =
      queryClient.getQueryData<Project[]>(["projects"]) ?? [];
    const currentProject = projectsBefore.find((p) => p.id === input.id);
    const goalChanged = input.goalId !== currentProject?.goalId;

    // 1) Update the project itself (useUpdateProject already handles CSRF/auth now)
    const updated = await updateProjectAsync(input);

    // 2) Ensure cache reflects the updated project immediately
    queryClient.setQueryData<Project[]>(["projects"], (old) => {
      if (!old) return [updated];
      return old.map((p) => (p.id === updated.id ? updated : p));
    });

    // 3) Propagate goalId to descendants if it changed
    if (goalChanged && input.goalId != null) {
      const projectsNow =
        queryClient.getQueryData<Project[]>(["projects"]) ?? projectsBefore;
      const descendants = getDescendants(projectsNow, updated.id);

      // only set goalId for descendants that *don’t* have one
      for (const desc of descendants) {
        if (!desc.goalId) {
          await updateProjectAsync({ id: desc.id, goalId: input.goalId });
        }
      }
    }

    return updated;
  }

  return {
    mutateAsync: mutateWithPropagation,
    ...rest,
  };
}
