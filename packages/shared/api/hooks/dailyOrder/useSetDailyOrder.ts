import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

type OrderItem = {
  entity_type: "goal" | "project" | "milestone" | "task";
  entity_id: number;
  position: number;
};

type Payload = {
  dateStr: string;
  items: OrderItem[];
};

export function useSetDailyOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Payload) => {
      await ensureCsrf();
      return api.put("/daily-order/", {
        date: payload.dateStr,
        items: payload.items,
      });
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ["daily-order", vars.dateStr] });
    },
  });
}
