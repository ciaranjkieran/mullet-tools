import { useQuery } from "@tanstack/react-query";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { Milestone } from "@shared/types/Milestone";
import { mapMilestoneFromApi } from "../../mappers/milestoneMapper";
import { useEffect } from "react";
import api from "../../axios";

export function useMilestones() {
  const setMilestones = useMilestoneStore((s) => s.setMilestones);

  const query = useQuery<Milestone[]>({
    queryKey: ["milestones"],
    queryFn: async () => {
      const res = await api.get("/milestones/");
      return res.data.map(mapMilestoneFromApi);
    },
  });

  useEffect(() => {
    if (query.data) setMilestones(query.data);
  }, [query.data, setMilestones]);

  return query;
}
