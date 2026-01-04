"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { useGoalStore } from "../../../store/useGoalStore";
import { ensureCsrf } from "../auth/ensureCsrf";

type ReorderPayload = {
  modeId: number;
  container: { kind: "mode"; id: number };
  changes: { id: number; position: number }[];
};

export function useReorderGoalsHome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: ReorderPayload) => {
      await ensureCsrf();
      return api.patch("/goals/reorder-home/", {
        mode_id: body.modeId,
        container: body.container,
        changes: body.changes,
      });
    },

    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ["goals"] });
      const snapshot = useGoalStore.getState().goals;

      useGoalStore.getState().updateGoalPositionsLocally(body.changes);

      return { previous: snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) useGoalStore.setState({ goals: ctx.previous });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}
