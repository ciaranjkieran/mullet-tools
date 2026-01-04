import { useQuery } from "@tanstack/react-query";
import type { Template } from "../../../types/Template";
import api from "../../axios";

export const useTemplates = () =>
  useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: async () => (await api.get("/templates/")).data,
  });

export const useTemplateById = (id: number) =>
  useQuery<Template>({
    queryKey: ["template", id],
    queryFn: async () => (await api.get(`/templates/${id}/`)).data,
    enabled: !!id,
  });
