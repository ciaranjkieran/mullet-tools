import { useState } from "react";

type Range = { from: string; to: string };

import { useStatsFilterStore } from "@shared/store/useStatsFilterStore";

export function useStatsRange() {
  const { range, setRange } = useStatsFilterStore();
  return [range, setRange] as const;
}
