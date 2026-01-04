import { useMutation } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

type ModePositionUpdate = {
  id: number;
  position: number;
};

export const useUpdateModePositions = () => {
  return useMutation({
    mutationFn: async (updates: ModePositionUpdate[]) => {
      await ensureCsrf();

      await Promise.all(
        updates.map(({ id, position }) =>
          api.patch(`/modes/${id}/`, { position })
        )
      );
    },
  });
};
