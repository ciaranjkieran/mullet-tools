import { useQuery } from "@tanstack/react-query";
import { Project } from "../../../types/Project";
import { mapProjectFromApi } from "../../mappers/projectMapper";
import api from "../../axios";

export function useProjects() {
  const query = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get("/projects/");
      return res.data.map(mapProjectFromApi);
    },
  });

  return query;
}
