export type CommentAttachment = {
  id: number;
  file: string;
  uploaded_at: string;
};

export type Comment = {
  id: number;
  mode: number;
  content_type: number;
  object_id: number;
  entity_model?: string; // ✅ now included from backend
  body: string;
  created_at: string;
  is_deleted: boolean;
  attachments: CommentAttachment[];
};
