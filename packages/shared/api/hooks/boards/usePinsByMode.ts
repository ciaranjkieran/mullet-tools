import { useQuery } from "@tanstack/react-query";
import api from "../../axios";
import { Pin } from "../../../types/Pin";

export function usePinsByMode(modeId: number, options = {}) {
  return useQuery<Pin[]>({
    queryKey: ["pins", "mode", modeId],
    queryFn: async () => {
      const res = await api.get(`/boards/pins/?mode=${modeId}`);
      return res.data;
    },
    enabled: !!modeId,
    ...options,
  });
}
