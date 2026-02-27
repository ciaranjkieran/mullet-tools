import type { Assignee } from "./Assignee";

export type Note = {
  id: number;
  modeId: number;
  body: string;
  created_at: string;
  updated_at: string;
  content_type: string;
  object_id: number;
  entityTitle?: string;
  display_title: string;
  author?: Assignee | null;
};
