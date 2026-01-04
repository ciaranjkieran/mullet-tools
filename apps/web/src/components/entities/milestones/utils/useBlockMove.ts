// utils/blockMove.ts
export function blockMove<T>(list: T[], block: T[], toIndex: number): T[] {
  const set = new Set(block);
  const withoutBlock = list.filter((x) => !set.has(x));
  const clamped = Math.max(0, Math.min(toIndex, withoutBlock.length));
  return [
    ...withoutBlock.slice(0, clamped),
    ...block,
    ...withoutBlock.slice(clamped),
  ];
}
