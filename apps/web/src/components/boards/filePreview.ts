// lib/pins/filePreview.ts
import type { Pin } from "@shared/types/Pin";

export function getExt(pin: Pin) {
  const fromMime = pin.mime_type?.split("/")[1];
  const fromFile = pin.file?.split("?")[0].split(".").pop();
  return (fromFile || fromMime || "").toLowerCase();
}

export function getFileLabel(ext: string) {
  if (!ext) return "FILE";
  if (ext === "pdf") return "PDF";
  if (["mp3", "wav", "m4a", "aac"].includes(ext)) return "AUDIO";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "ARCHIVE";
  if (["doc", "docx"].includes(ext)) return "DOC";
  if (["xls", "xlsx"].includes(ext)) return "XLS";
  if (["ppt", "pptx"].includes(ext)) return "PPT";
  return ext.toUpperCase();
}
