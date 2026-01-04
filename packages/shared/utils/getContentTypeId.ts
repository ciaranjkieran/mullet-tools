// lib/utils/getContentTypeId.ts

// This mapping must match your ContentType IDs in the database
// You can dynamically fetch them later if needed
export const getContentTypeId = (model: string): number => {
  const map: Record<string, number> = {
    task: 1,
    milestone: 2,
    project: 3,
    goal: 4,
    mode: 5,
  };

  const id = map[model.toLowerCase()];
  if (!id) {
    throw new Error(`Unknown content type: ${model}`);
  }

  return id;
};
