import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Template } from "../../../types/Template";
import api from "../../axios"; // your axios instance

export const useTemplateById = (id: number) =>
  useQuery({
    queryKey: ["template", id],
    queryFn: () => api.get(`/templates/${id}/`).then((res) => res.data),
    enabled: !!id,
  });
