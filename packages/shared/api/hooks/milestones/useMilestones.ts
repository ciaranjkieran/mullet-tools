import { useQuery } from "@tanstack/react-query";
import { Milestone } from "@shared/types/Milestone";
import { mapMilestoneFromApi } from "../../mappers/milestoneMapper";
import api from "../../axios";

export function useMilestones() {
  const query = useQuery<Milestone[]>({
    queryKey: ["milestones"],
    queryFn: async () => {
      const res = await api.get("/milestones/");
      return res.data.map(mapMilestoneFromApi);
    },
  });

  return query;
}
