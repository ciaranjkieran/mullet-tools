"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export type ChainUpEntityType = "goal" | "project" | "milestone" | "task";

type ChainUpPayload = {
  entityType: ChainUpEntityType;
  entityId: number;
};

type ChainUpResponse = {
  updated: number;
};

async function postChainUp(payload: ChainUpPayload): Promise<ChainUpResponse> {
  await ensureCsrf();
  const res = await api.post<ChainUpResponse>("/stats/chain-up", payload);
  return res.data;
}

export function useStatsChainUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postChainUp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statsTree"] });
      queryClient.invalidateQueries({ queryKey: ["statsSummary"] });
      // optionally, if you have other stats keys:
      // queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
