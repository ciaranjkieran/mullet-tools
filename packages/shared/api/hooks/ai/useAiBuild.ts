import { useMutation } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import type { AiBuildRequest, AiBuildResponse } from "../../../types/AiBuilder";

export function useAiBuild() {
  return useMutation({
    mutationFn: async (payload: AiBuildRequest): Promise<AiBuildResponse> => {
      await ensureCsrf();
      const res = await api.post<AiBuildResponse>("/ai/build/", payload);
      return res.data;
    },
  });
}
