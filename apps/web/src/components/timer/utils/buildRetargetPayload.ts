function buildRetargetPayload(args: {
  modeId: number | null | undefined;
  goalId: number | null | undefined;
  projectId: number | null | undefined;
  milestoneId: number | null | undefined;
  taskId: number | null | undefined;
}) {
  const { taskId, milestoneId, projectId, goalId, modeId } = args;

  if (taskId != null) return { taskId };
  if (milestoneId != null) return { milestoneId };
  if (projectId != null) return { projectId };
  if (goalId != null) return { goalId };
  if (modeId != null && modeId !== -1) return { modeId };

  // nothing selected → no-op; caller can guard
  return null;
}
