// dndIds.ts
export const mid = (id: number) => `milestone:${id}`;
export const parseMid = (s: string) => Number(String(s).split(":")[1]);
