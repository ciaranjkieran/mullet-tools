import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import type { Pin } from "../../../types/Pin";
import { ensureCsrf } from "../auth/ensureCsrf";

export type UpdatePinInput = {
  id: string | number;
  data: Partial<Pick<Pin, "title" | "description" | "url" | "mode">> & {
    file?: File;
  };
};

export function useUpdatePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdatePinInput): Promise<Pin> => {
      await ensureCsrf();

      const file = data.file;

      if (file) {
        const fd = new FormData();

        if (data.title != null) fd.append("title", data.title);
        if (data.description != null)
          fd.append("description", data.description);
        if (data.url != null) fd.append("url", data.url);

        // ✅ backend likely expects "mode"
        if (data.mode != null) fd.append("mode", String(data.mode));

        fd.append("file", file);

        const res = await api.patch(`/boards/pins/${id}/`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        return res.data;
      }

      // JSON patch (no file)
      const res = await api.patch(`/boards/pins/${id}/`, data);
      return res.data;
    },

    onSuccess: (updatedPin, _vars) => {
      // ✅ broad
      queryClient.invalidateQueries({ queryKey: ["pins"] });

      // ✅ important: your UI fetches by ?mode=, so these queries must refresh too.
      // If your hook uses a different key, change this to match.
      queryClient.invalidateQueries({ queryKey: ["pinsByMode"] });

      // Optional: if your pins-by-mode key includes mode value:
      // queryClient.invalidateQueries({ queryKey: ["pinsByMode", Number(updatedPin.mode)] });
    },
  });
}
