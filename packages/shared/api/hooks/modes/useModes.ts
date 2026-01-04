"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import api from "../../axios"; // <-- your configured axios
import { Mode } from "../../../types/Mode";
import { useModeStore } from "../../../store/useModeStore";
import { mapModeFromApi } from "../../mappers/modeMapper";

export function useModes() {
  const setModes = useModeStore((s) => s.setModes);

  const query = useQuery<Mode[], Error>({
    queryKey: ["modes"],
    queryFn: async () => {
      const res = await api.get("/modes/"); // baseURL already has /api
      const mapped = res.data.map(mapModeFromApi);
      return mapped.filter((m: Mode) => m.title.toLowerCase() !== "all");
    },
  });

  useEffect(() => {
    if (query.data) setModes(query.data);
  }, [query.data, setModes]);

  return query;
}
