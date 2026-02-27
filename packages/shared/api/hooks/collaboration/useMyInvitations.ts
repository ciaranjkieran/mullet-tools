import { useQuery } from "@tanstack/react-query";
import api from "../../axios";
import type { ModeInvitation } from "../../../types/Collaboration";

export function useMyInvitations(enabled = true) {
  return useQuery<ModeInvitation[]>({
    queryKey: ["my-invitations"],
    queryFn: async () => {
      const res = await api.get("/collaboration/invitations/");
      return res.data;
    },
    enabled,
  });
}
