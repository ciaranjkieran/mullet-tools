import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Milestone } from "../../../types/Milestone";
import { useMilestoneStore } from "../../../store/useMilestoneStore";
import {
  mapMilestoneFromApi,
  mapMilestoneToApi,
} from "../../mappers/milestoneMapper";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

interface CreateMilestoneInput {
  title: string;
  modeId: number;
  dueDate?: string | null;
  dueTime?: string | null;
  parentId?: number | null;
  projectId?: number | null;
  goalId?: number | null;
  assignedToId?: number | null;
}

async function createMilestone(
  input: CreateMilestoneInput
): Promise<Milestone> {
  await ensureCsrf();

  const body = {
    isCompleted: false,
    ...mapMilestoneToApi({
      title: input.title,
      modeId: input.modeId,
      dueDate: input.dueDate ?? undefined,
      dueTime: input.dueTime ?? undefined,
      parentId: input.parentId ?? undefined,
      projectId: input.projectId ?? undefined,
      goalId: input.goalId ?? undefined,
    }),
  };

  const res = await api.post("/milestones/", body);
  return mapMilestoneFromApi(res.data);
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  const addMilestone = useMilestoneStore((s) => s.addMilestone);

  return useMutation({
    mutationFn: createMilestone,
    onSuccess: (milestone) => {
      addMilestone(milestone);
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
    },
  });
}
