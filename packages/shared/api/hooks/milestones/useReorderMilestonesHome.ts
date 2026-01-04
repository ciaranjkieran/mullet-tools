"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { useMilestoneStore } from "../../../store/useMilestoneStore";
import { ensureCsrf } from "../auth/ensureCsrf";

type ReorderPayload = {
  modeId: number;
  container: { kind: "milestone" | "project" | "goal" | "mode"; id: number };
  changes: { id: number; position: number }[];
};

export function useReorderMilestonesHome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: ReorderPayload) => {
      await ensureCsrf();
      return api.patch("/milestones/reorder-home/", {
        mode_id: body.modeId,
        container: body.container,
        changes: body.changes,
      });
    },

    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ["milestones"] });
      const snapshot = useMilestoneStore.getState().milestones;

      useMilestoneStore
        .getState()
        .updateMilestonePositionsLocally(body.changes);

      return { previous: snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        useMilestoneStore.setState({ milestones: ctx.previous });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
    },
  });
}
