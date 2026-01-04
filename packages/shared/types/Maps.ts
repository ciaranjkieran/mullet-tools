// @shared/types/Maps.ts
import { Goal } from "./Goal";
import { Project } from "./Project";
import { Milestone } from "./Milestone";

export type Maps = {
  goalMap: Record<number, Goal>;
  projectMap: Record<number, Project>;
  milestoneMap: Record<number, Milestone>;
};
