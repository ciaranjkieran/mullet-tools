import { useQuery } from "@tanstack/react-query";
import api from "../../axios";
import { Pin } from "../../../types/Pin";

export function usePinById(pinId: string | null) {
  return useQuery<Pin>({
    queryKey: ["pin", pinId],
    queryFn: async () => {
      const res = await api.get(`/boards/pins/${pinId}`);
      return res.data;
    },
    enabled: !!pinId,
  });
}
