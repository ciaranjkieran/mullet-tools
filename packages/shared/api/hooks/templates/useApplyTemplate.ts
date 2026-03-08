// @shared/api/hooks/templates/useApplyTemplate.ts
import { Template } from "@shared/types/Template";
import { Project } from "@shared/types/Project";
import { Milestone } from "@shared/types/Milestone";
import { useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

type ApplyResponse = {
  ok: boolean;
  type: "project" | "milestone";
  id: number;
  title: string;
  modeId: number;
};

/**
 * Applies a template via a single bulk endpoint (POST /templates/apply/).
 * All entities are created server-side in one transaction.
 */
export default function useApplyTemplate() {
  const queryClient = useQueryClient();

  async function applyTemplate(
    tpl: Template
  ): Promise<Project | Milestone> {
    await ensureCsrf();

    const res = await api.post<ApplyResponse>("/templates/apply/", {
      type: tpl.type,
      mode: tpl.mode,
      data: tpl.data,
    });

    // Invalidate all entity queries so the new entities appear
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["milestones"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });

    const result = res.data;

    // Return a shape compatible with callers (UseTemplateModal, web Use windows)
    if (result.type === "project") {
      return { id: result.id, title: result.title, modeId: result.modeId } as Project;
    }
    return { id: result.id, title: result.title, modeId: result.modeId } as Milestone;
  }

  return { applyTemplate };
}
