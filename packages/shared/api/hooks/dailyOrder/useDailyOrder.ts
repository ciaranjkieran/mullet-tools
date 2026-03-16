import { useQuery } from "@tanstack/react-query";
import api from "../../axios";

export type DailyOrderItem = {
  entity_type: "goal" | "project" | "milestone" | "task";
  entity_id: number;
  position: number;
};

export function useDailyOrder(dateStr: string) {
  return useQuery({
    queryKey: ["daily-order", dateStr],
    queryFn: async () => {
      const { data } = await api.get<DailyOrderItem[]>("/daily-order/", {
        params: { date: dateStr },
      });
      return data;
    },
  });
}
