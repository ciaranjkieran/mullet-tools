// lib/pins/preview.ts
import type { Pin } from "@shared/types/Pin";

const yt =
  /(?:youtube\.com\/(?:watch\?.*?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;

export function getPreviewSrc(pin: Pin): string | null {
  if (pin.thumbnail) return pin.thumbnail;
  if (pin.kind === "image" && pin.file) return pin.file;

  // ✅ handle YouTube even when stored as a link
  if (pin.url) {
    const m = pin.url.match(yt);
    if (m?.[1]) return `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`;
  }

  if (pin.kind === "video") {
    if (
      pin.file &&
      (pin.mime_type?.startsWith("video/") ||
        /\.(mp4|webm|ogg)$/i.test(pin.file))
    )
      return null; // let <video> render

    return null;
  }

  return null;
}

export function getFavicon(pin: Pin): string | null {
  if (pin.kind !== "link" || !pin.url) return null;
  try {
    const u = new URL(pin.url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`;
  } catch {
    return null;
  }
}
function looksLikeUploadSuffix(token: string) {
  // e.g. WwOLAPL, aB12CdE, 9f3aK2, etc.
  return (
    /^[A-Za-z0-9]{5,12}$/.test(token) &&
    (/\d/.test(token) || (/[A-Z]/.test(token) && /[a-z]/.test(token)))
  );
}

function fileDisplayName(fileUrl: string) {
  const clean = fileUrl.split("#")[0].split("?")[0];
  const last = clean.split("/").pop() || "";

  let decoded = last;
  try {
    decoded = decodeURIComponent(last);
  } catch {}

  // humanise for UI
  decoded = decoded.replace(/\+/g, " ").replace(/_/g, " ").trim();

  // split extension
  const m = decoded.match(/^(.*?)(\.[a-z0-9]+)$/i);
  if (!m) return decoded;

  let base = m[1].trim();
  const ext = m[2];

  // remove trailing "upload suffix" token if present
  const parts = base.split(/\s+/);
  const lastToken = parts[parts.length - 1];

  if (lastToken && looksLikeUploadSuffix(lastToken)) {
    parts.pop();
    base = parts.join(" ").trim();
  }

  return `${base}${ext}`;
}

export function getPrimaryText(pin: Pin): string {
  if (pin.title) return pin.title;
  if (pin.kind === "link" && pin.url) return pin.url;

  if (
    (pin.kind === "image" || pin.kind === "video" || pin.kind === "file") &&
    pin.file
  ) {
    return fileDisplayName(pin.file);
  }

  return "";
}
export function isMp4File(pin: Pin): boolean {
  return Boolean(
    pin.file &&
      (pin.file.endsWith(".mp4") || pin.mime_type?.startsWith("video/"))
  );
}

export function truncateFilename(name: string, max = 40) {
  if (name.length <= max) return name;

  const match = name.match(/(.+?)(\.[a-z0-9]+)$/i);
  if (!match) return name.slice(0, max - 1) + "…";

  const [, base, ext] = match;
  const allowed = max - ext.length - 1;

  return base.slice(0, allowed) + "…" + ext;
}
