"use client";

import Image from "next/image";
import type { Pin } from "@shared/types/Pin";
import {
  Pencil,
  Link as LinkIcon,
  File as FileIcon,
  Play,
  FileText,
  FileArchive,
  FileAudio,
  FileSpreadsheet,
  FileImage,
  File as FileGeneric,
} from "lucide-react";
import clsx from "clsx";
import {
  getPreviewSrc,
  getPrimaryText,
  isMp4File,
  getFavicon,
} from "./preview";
import { getExt, getFileLabel } from "./filePreview";

type Props = {
  pin: Pin;
  onClick?: (p: Pin) => void;
  onEditClick?: (p: Pin) => void;
};

function truncateFilename(name: string, max = 40) {
  if (!name) return "";
  if (name.length <= max) return name;

  const match = name.match(/(.+?)(\.[a-z0-9]+)$/i);
  if (!match) return name.slice(0, max - 1) + "…";

  const [, base, ext] = match;
  const allowed = max - ext.length - 1;

  return base.slice(0, allowed) + "…" + ext;
}

function getFileIconByExt(ext: string) {
  if (ext === "pdf" || ext === "txt") return FileText;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return FileArchive;
  if (["mp3", "wav", "m4a", "aac", "flac", "ogg"].includes(ext))
    return FileAudio;
  if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return FileImage;
  return FileGeneric;
}

function getDisplayTitle(pin: Pin, fallback: string, max = 60) {
  const raw = pin.title?.trim() || fallback;
  return truncateFilename(raw, max);
}

function HoverTitleOverlay({ title }: { title: string }) {
  if (!title) return null;

  return (
    <div
      className={clsx(
        "absolute inset-x-0 bottom-0",
        "bg-gradient-to-t from-black/70 to-transparent",
        "px-3 py-2",
        "opacity-0 group-hover:opacity-100 transition-opacity"
      )}
    >
      <div className="text-xs text-white line-clamp-2 text-center">{title}</div>
    </div>
  );
}

export default function PinCard({ pin, onClick, onEditClick }: Props) {
  const preview = getPreviewSrc(pin);
  const favicon = getFavicon(pin);
  const text = getPrimaryText(pin);
  const displayTitle = getDisplayTitle(pin, text, 60);

  const badge =
    pin.kind === "link" ? (
      <LinkIcon className="w-4 h-4" />
    ) : pin.kind === "file" ? (
      <FileIcon className="w-4 h-4" />
    ) : pin.kind === "video" ? (
      <Play className="w-4 h-4" />
    ) : null;

  return (
    <div
      className={clsx(
        "w-full h-[160px] relative flex items-center justify-center",
        "bg-white rounded shadow overflow-hidden cursor-pointer group"
      )}
      onClick={() => onClick?.(pin)}
      title={pin.title?.trim() || undefined}
    >
      {/* Image pin — full preview (no crop) */}
      {pin.kind === "image" && (preview || pin.file) && (
        <div className="absolute inset-0 group">
          <Image
            src={preview || pin.file!}
            alt={pin.title || "Image"}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
          <HoverTitleOverlay title={displayTitle} />
        </div>
      )}

      {/* Video pin — full preview (poster or YouTube thumb); mp4 renders as video */}
      {pin.kind === "video" &&
        (pin.file || pin.url) &&
        (isMp4File(pin) ? (
          <div className="absolute inset-0 group">
            <video
              src={pin.file!}
              className="w-full h-full object-contain"
              controls
              playsInline
              poster={pin.thumbnail || undefined}
            />
            <div className="pointer-events-none">
              <HoverTitleOverlay title={displayTitle} />
            </div>
          </div>
        ) : preview ? (
          <div className="absolute inset-0 flex items-center justify-center group">
            <Image
              src={preview}
              alt={pin.title || "Video"}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            <Play className="absolute w-10 h-10 text-white/90 drop-shadow left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
            <HoverTitleOverlay title={displayTitle} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-sm text-gray-600">
            <Play className="w-6 h-6 mb-1" />
            Open video
          </div>
        ))}

      {/* Link pin — prefer backend thumbnail; else favicon fallback */}
      {pin.kind === "link" &&
        !["image", "video"].includes(pin.kind) &&
        (preview ? (
          <div className="absolute inset-0 flex items-center justify-center group">
            <Image
              src={preview}
              alt={pin.title || "Link preview"}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            <HoverTitleOverlay title={displayTitle} />
          </div>
        ) : favicon ? (
          <div className="flex items-center gap-3 px-4">
            <img
              src={favicon}
              alt="favicon"
              width={32}
              height={32}
              className="rounded"
            />
            <div className="min-w-0">
              <div className="text-sm font-medium line-clamp-2">{text}</div>
              {pin.url && (
                <div className="text-xs text-gray-500 truncate">
                  {safeHostname(pin.url)}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {badge}
              <span className="text-sm">Link</span>
            </div>
            <div className="line-clamp-2 text-gray-800">{text}</div>
          </div>
        ))}

      {/* File pin — prefer backend thumbnail; else file tile */}
      {pin.kind === "file" &&
        (() => {
          const ext = getExt(pin);
          const label = getFileLabel(ext);
          const Icon = getFileIconByExt(ext);

          // ✅ If backend generated a thumbnail (e.g. PDF page 1), show it + hover title
          if (preview) {
            return (
              <div className="absolute inset-0 group">
                <Image
                  src={preview}
                  alt={displayTitle || "File preview"}
                  fill
                  className="object-contain bg-white"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />

                {/* optional ext badge over thumbnail */}
                <div className="absolute left-2 top-2 z-10 text-[10px] px-2 py-[2px] rounded-full bg-white/90 text-gray-900 shadow">
                  {label}
                </div>

                <HoverTitleOverlay title={displayTitle} />
              </div>
            );
          }

          // fallback: nice file tile
          const filename = pin.title?.trim() || truncateFilename(text, 40);

          return (
            <div className="w-full h-full flex flex-col items-center justify-center px-4">
              <div className="relative">
                <div className="w-16 h-20 rounded-xl bg-gray-50 border flex items-center justify-center shadow-sm">
                  <Icon className="w-8 h-8 text-gray-700" />
                </div>

                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] px-2 py-[2px] rounded-full bg-gray-900 text-white">
                  {label}
                </div>
              </div>

              <div className="mt-4 w-full flex justify-center">
                <div className="max-w-[140px] w-full text-center">
                  <div className="text-sm font-medium leading-snug">
                    {filename}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Edit button */}
      <button
        className={clsx(
          "absolute top-2 right-2 z-10 p-1 rounded bg-white shadow",
          "hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onEditClick?.(pin);
        }}
        aria-label="Edit Pin"
      >
        <Pencil className="w-4 h-4 text-gray-700" />
      </button>

      {/* Kind badge */}
      {badge && (
        <div className="absolute left-2 top-2 z-10 rounded bg-white/90 px-2 py-1 text-xs shadow">
          <div className="flex items-center gap-1">
            {badge}
            <span className="capitalize">{pin.kind}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function safeHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
