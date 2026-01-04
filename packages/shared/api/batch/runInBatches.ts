// src/shared/batch/runInBatches.ts
export async function runInBatches<T>(
  items: T[],
  fn: (item: T) => Promise<unknown>,
  concurrency = 8
) {
  const results: PromiseSettledResult<unknown>[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try {
        const value = await fn(items[idx]);
        results[idx] = { status: "fulfilled", value };
      } catch (reason) {
        results[idx] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
  return results;
}
