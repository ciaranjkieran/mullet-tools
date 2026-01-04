// apps/web/src/shared/api/hooks/stats/useStatsTree.ts (adjust path to match your setup)
"use client";

import { useQuery } from "@tanstack/react-query";
import type { StatsTree } from "../../../types/Stats";
import api from "../../axios";

export type UseStatsTreeArgs = {
  modeId: number; // concrete mode
  from?: string; // "YYYY-MM-DD" (optional for all-time)
  to?: string; // "YYYY-MM-DD" (optional for all-time)
};

async function fetchStatsTree(args: UseStatsTreeArgs): Promise<StatsTree> {
  const params: Record<string, number | string> = {
    modeId: args.modeId,
  };

  if (args.from && args.to) {
    params.from = args.from;
    params.to = args.to;
  }

  const res = await api.get<StatsTree>("/stats/tree", { params });
  return res.data;
}

export function useStatsTree(args: UseStatsTreeArgs | null) {
  return useQuery<StatsTree>({
    queryKey: ["statsTree", args],
    queryFn: () => {
      if (!args) {
        throw new Error("useStatsTree called without args");
      }
      return fetchStatsTree(args);
    },
    // allow calling with just { modeId } for all-time metadata
    enabled: !!args && !!args.modeId,
  });
}
