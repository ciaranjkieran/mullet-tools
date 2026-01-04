import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mapCreateModeToApi } from "@shared/api/mappers/modeMapper";
import { CreateModeInput } from "@shared/types/Mode";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export function useCreateMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mode: CreateModeInput) => {
      await ensureCsrf();
      const res = await api.post("/modes/", mapCreateModeToApi(mode));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modes"] });
    },
  });
}
