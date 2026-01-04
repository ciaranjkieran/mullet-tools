"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { useProjectStore } from "../../../store/useProjectStore";
import { ensureCsrf } from "../auth/ensureCsrf";

type ReorderPayload = {
  modeId: number;
  container: { kind: "project" | "mode" | "goal"; id: number };
  changes: { id: number; position: number }[];
};

export function useReorderProjectsHome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: ReorderPayload) => {
      await ensureCsrf();
      return api.patch("/projects/reorder-home/", {
        mode_id: body.modeId,
        container: body.container,
        changes: body.changes,
      });
    },

    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ["projects"] });
      const snapshot = useProjectStore.getState().projects;

      useProjectStore.getState().updateProjectPositionsLocally(body.changes);

      return { previous: snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) useProjectStore.setState({ projects: ctx.previous });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
