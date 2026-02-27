import { useQuery } from "@tanstack/react-query";
import api from "../../axios";
import type { ModeCollaboratorsResponse } from "../../../types/Collaboration";

export function useModeCollaborators(modeId: number | null) {
  return useQuery<ModeCollaboratorsResponse>({
    queryKey: ["mode-collaborators", modeId],
    queryFn: async () => {
      const res = await api.get(`/collaboration/modes/${modeId}/collaborators/`);
      return res.data;
    },
    enabled: !!modeId,
  });
}
