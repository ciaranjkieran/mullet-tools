import { useQuery } from "@tanstack/react-query";
import { useProjectStore } from "../../../../shared/store/useProjectStore";
import { Project } from "../../../types/Project";
import { mapProjectFromApi } from "../../mappers/projectMapper";
import { useEffect } from "react";
import api from "../../axios";

export function useProjects() {
  const setProjects = useProjectStore((s) => s.setProjects);

  const query = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get("/projects/");
      return res.data.map(mapProjectFromApi);
    },
  });

  useEffect(() => {
    if (query.data) setProjects(query.data);
  }, [query.data, setProjects]);

  return query;
}
