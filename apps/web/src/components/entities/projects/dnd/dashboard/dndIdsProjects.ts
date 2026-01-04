// dndIdsProjects.ts
export const pid = (id: number) => `project:${id}`;
export const parsePid = (s: string) => Number(String(s).split(":")[1]);
