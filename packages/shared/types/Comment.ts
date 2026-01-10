export type CommentAttachment = {
  id: number;
  url: string;
  original_name: string;
  mime: string;
  uploaded_at: string;
};

export type Comment = {
  id: number;
  mode: number;
  content_type: number | null;
  object_id: number | null;
  entity_model?: string | null;
  entity_title?: string | null;
  body: string;
  created_at: string;
  is_deleted: boolean;
  attachments: CommentAttachment[];
};
