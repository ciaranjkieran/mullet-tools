import { useStatsFilterStore } from "@shared/store/useStatsFilterStore";

export function useStatsRange() {
  const { range, setRange } = useStatsFilterStore();
  return [range, setRange] as const;
}
