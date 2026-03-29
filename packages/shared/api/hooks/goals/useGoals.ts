import { useQuery } from "@tanstack/react-query";
import { Goal } from "../../../types/Goal";
import { mapGoalFromApi } from "../../mappers/goalMapper";
import api from "../../axios";

export const useGoals = () => {
  const query = useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: async () => {
      const res = await api.get("/goals/");
      return res.data.map(mapGoalFromApi);
    },
  });

  return query;
};
