import { useQuery } from "@tanstack/react-query";
import api from "../../axios";
import type { ModeMembersResponse } from "../../../types/Collaboration";

export function useModeMembers(modeId: number | null) {
  return useQuery<ModeMembersResponse>({
    queryKey: ["mode-members", modeId],
    queryFn: async () => {
      const res = await api.get(`/collaboration/modes/${modeId}/members/`);
      return res.data;
    },
    enabled: !!modeId,
  });
}
