import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import { Mode } from "../../../types/Mode";

type OrdersPayload = { orders: { id: number; position: number }[] };
const MODES_QK = ["modes"];

export function useReorderModes() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: OrdersPayload): Promise<Mode[]> => {
      await ensureCsrf();
      const res = await api.post("/modes/reorder/", payload);
      return res.data as Mode[];
    },
    onSuccess: (data) => {
      qc.setQueryData<Mode[]>(MODES_QK, data);
    },
  });
}

export function buildFullModeReorder(modes: Mode[]) {
  return { orders: modes.map((m, i) => ({ id: m.id as number, position: i })) };
}
