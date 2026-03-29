"use client";

import { useQuery } from "@tanstack/react-query";
import api from "../../axios";
import { Mode } from "../../../types/Mode";
import { mapModeFromApi } from "../../mappers/modeMapper";

export function useModes() {
  const query = useQuery<Mode[], Error>({
    queryKey: ["modes"],
    queryFn: async () => {
      const res = await api.get("/modes/");
      const mapped = res.data.map(mapModeFromApi);
      return mapped.filter((m: Mode) => m.title.toLowerCase() !== "all");
    },
  });

  return query;
}
