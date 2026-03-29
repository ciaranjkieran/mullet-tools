import { useQuery } from "@tanstack/react-query";
import { useGoalStore } from "../../../store/useGoalStore";
import { Goal } from "../../../types/Goal";
import { mapGoalFromApi } from "../../mappers/goalMapper";
import { useEffect } from "react";
import api from "../../axios"; // ✅ same api instance as useMe/useLogin

export const useGoals = () => {
  const setGoals = useGoalStore((s) => s.setGoals);

  const query = useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: async () => {
      const res = await api.get("/goals/");
      return res.data.map(mapGoalFromApi);
    },
  });

  useEffect(() => {
    if (query.data) setTimeout(() => setGoals(query.data!), 0);
  }, [query.data, setGoals]);

  return query;
};
