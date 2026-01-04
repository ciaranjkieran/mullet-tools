import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mapUpdateModeToApi } from "@shared/api/mappers/modeMapper";
import { UpdateModeInput } from "@shared/types/Mode";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export function useUpdateMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mode: UpdateModeInput) => {
      await ensureCsrf();
      const res = await api.patch(
        `/modes/${mode.id}/`,
        mapUpdateModeToApi(mode)
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modes"] });
    },
  });
}
