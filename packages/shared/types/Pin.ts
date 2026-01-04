export type PinKind = "image" | "link" | "video" | "file";

export type Pin = {
  id: number;
  kind: PinKind;
  title?: string | null;
  description?: string | null;
  file?: string | null;
  thumbnail?: string | null;
  url?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  display_title?: string; // ✅ add

  // ✅ preferred, matches CreatePinInput
  modeId: number;

  // 🧯 temporary compatibility if some API responses still send `mode`
  // remove once everything uses modeId
  mode?: number | string;

  content_type?: string | null;
  object_id?: number | null;
  entity_title?: string | null;
  is_board_item: boolean;
  created_at: string;
};

export type CreatePinInput = {
  kind: PinKind;
  modeId: number;
  entity: "mode" | "task" | "milestone" | "project" | "goal";
  entityId: number;
  title?: string;
  description?: string;
  file?: File;
  url?: string;
};
