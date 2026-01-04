import { useQuery } from "@tanstack/react-query";
import api from "../../axios";
import { Pin } from "../../../types/Pin";

export function usePinsByEntity(
  entityType: string,
  entityId: string,
  options = {}
) {
  return useQuery<Pin[]>({
    queryKey: ["pins", entityType, entityId],
    queryFn: async () => {
      const res = await api.get(
        `/boards/pins/?entity_type=${entityType}&entity_id=${entityId}`
      );
      return res.data;
    },
    enabled: !!entityType && !!entityId,
    ...options,
  });
}
