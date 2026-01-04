import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import type { Pin, CreatePinInput } from "../../../types/Pin";
import { ensureCsrf } from "../auth/ensureCsrf";
export function useCreatePin() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePinInput): Promise<Pin> => {
      await ensureCsrf();

      const form = new FormData();
      form.append("kind", input.kind);
      form.append("mode", String(input.modeId));
      form.append("entity", input.entity);
      form.append("entity_id", String(input.entityId));

      if (input.title) form.append("title", input.title);
      if (input.description) form.append("description", input.description);
      if (input.url) form.append("url", input.url);
      if (input.file) form.append("file", input.file);

      const { data } = await api.post("/boards/pins/", form);
      return data as Pin;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pins"] });
    },
  });
}
