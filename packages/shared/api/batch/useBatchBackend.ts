// src/shared/batch/featureFlag.ts
export const useBatchBackend = () =>
  process.env.NEXT_PUBLIC_USE_BATCH_BACKEND !== "false";
