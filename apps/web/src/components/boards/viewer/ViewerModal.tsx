"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  X,
  ArrowLeft,
  ArrowRight,
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
import Image from "next/image";
import { useViewerStore } from "./store/useViewerStore";
import { usePinsByMode } from "@shared/api/hooks/boards/usePinsByMode";
import { usePinsByEntity } from "@shared/api/hooks/boards/usePinsByEntity";
import type { Pin } from "@shared/types/Pin";
import {
  getPreviewSrc,
  getFavicon,
  isMp4File,
  getPrimaryText,
} from "../preview";
import { getExt, getFileLabel } from "../filePreview";

/** -------- file helpers (shared by overview + detail) -------- */
function getFileIconByExt(ext: string) {
  if (ext === "pdf" || ext === "txt") return FileText;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return FileArchive;
  if (["mp3", "wav", "m4a", "aac", "flac", "ogg"].includes(ext))
    return FileAudio;
  if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return FileImage;
  return FileGeneric;
}

function isAudio(pin: Pin) {
  const ext = getExt(pin);
  return (
    pin.mime_type?.startsWith("audio/") ||
    ["mp3", "wav", "m4a", "aac", "flac", "ogg"].includes(ext)
  );
}

function isImageFile(pin: Pin) {
  const ext = getExt(pin);
  return (
    pin.mime_type?.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)
  );
}

export default function ViewerModal() {
  const { isOpen, closeViewer, activePinId, context } = useViewerStore();

  const modeId = context?.type === "mode" ? context.modeId : undefined;
  const entity = context?.type === "entity" ? context.entity : undefined;
  const entityId = context?.type === "entity" ? context.entityId : undefined;

  const isMode = context?.type === "mode";
  const isEntity = context?.type === "entity";

  const modeQuery = usePinsByMode(modeId ?? -1, { enabled: isMode });
  const entityQuery = usePinsByEntity(entity ?? "", String(entityId ?? ""), {
    enabled: isEntity,
  });

  const pins: Pin[] = useMemo(() => {
    if (context?.type === "mode") return modeQuery.data ?? [];
    if (context?.type === "entity") return entityQuery.data ?? [];
    return [];
  }, [context, modeQuery.data, entityQuery.data]);

  const [index, setIndex] = useState(0);
  const [maxTopRowHeight, setMaxTopRowHeight] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !pins.length) return;
    if (activePinId !== undefined && activePinId !== null) {
      const i = pins.findIndex((p) => Number(p.id) === Number(activePinId));
      setIndex(i >= 0 ? i + 1 : 0);
    } else {
      setIndex(0);
    }
  }, [isOpen, pins, activePinId]);

  useEffect(() => {
    if (!gridRef.current) return;
    const children = Array.from(gridRef.current.children) as HTMLElement[];
    const topRowY = children[0]?.offsetTop ?? 0;
    const topRowHeights = children
      .filter((c) => c.offsetTop === topRowY)
      .map((c) => c.getBoundingClientRect().height);
    if (topRowHeights.length) setMaxTopRowHeight(Math.max(...topRowHeights));
  }, [pins, index]);

  if (!isOpen || !pins.length) return null;

  const handlePrev = () =>
    setIndex((prev) => (prev === 0 ? pins.length : prev - 1));
  const handleNext = () =>
    setIndex((prev) => (prev === pins.length ? 0 : prev + 1));

  const showOverview = index === 0;
  const currentPin = pins[index - 1];

  const openLink = (href?: string | null) => {
    if (!href) return;
    try {
      const u = new URL(href);
      if (u.protocol !== "https:" && u.protocol !== "http:") return;
    } catch {
      return;
    }
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const renderOverviewCell = (pin: Pin) => {
    const preview = getPreviewSrc(pin);
    const favicon = getFavicon(pin);

    if (pin.kind === "image" && (preview || pin.file)) {
      return (
        <Image
          src={preview || pin.file!}
          alt={pin.title || "Image"}
          width={300}
          height={200}
          className="object-contain rounded shadow max-h-[200px] w-auto bg-black/10"
        />
      );
    }

    if (pin.kind === "video") {
      if (isMp4File(pin)) {
        return (
          <div className="w-[300px] h-[200px] rounded shadow bg-black/10 flex items-center justify-center">
            <Play className="w-6 h-6 mr-2" />
            <div className="text-sm text-white/90">Video</div>
          </div>
        );
      }
      if (preview) {
        return (
          <div className="relative w-[300px] h-[200px] rounded shadow bg-black/10 overflow-hidden">
            <Image
              src={preview}
              alt={pin.title || "Video"}
              fill
              className="object-contain"
            />
            <Play className="absolute w-8 h-8 text-white left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
        );
      }
      return (
        <div className="w-[300px] h-[200px] rounded shadow bg-black/10 flex items-center justify-center">
          <Play className="w-6 h-6 mr-2" />
          <div className="text-sm text-white/90">Video</div>
        </div>
      );
    }

    if (pin.kind === "link") {
      if (preview) {
        return (
          <Image
            src={preview}
            alt={pin.title || "Link"}
            width={300}
            height={200}
            className="object-contain rounded shadow max-h-[200px] w-auto bg-black/10"
          />
        );
      }
      if (favicon) {
        return (
          <div className="w-[300px] h-[200px] rounded shadow bg-black/10 flex items-center justify-center gap-3 px-4">
            <Image
              src={favicon}
              alt="favicon"
              width={28}
              height={28}
              className="rounded"
              unoptimized
            />

            <div className="text-sm text-white/90 line-clamp-2 text-center">
              {pin.title || pin.url}
            </div>
          </div>
        );
      }
      return (
        <div className="w-[300px] h-[200px] rounded shadow bg-black/10 flex flex-col items-center justify-center text-white/90 px-3 text-center">
          <LinkIcon className="w-6 h-6 mb-2" />
          <div className="text-sm line-clamp-2">{pin.title || pin.url}</div>
        </div>
      );
    }

    if (pin.kind === "file") {
      const ext = getExt(pin);
      const label = getFileLabel(ext);
      const Icon = getFileIconByExt(ext);
      const filename = pin.title || getPrimaryText(pin);

      return (
        <div className="w-[300px] h-[200px] rounded shadow bg-black/10 flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-16 h-20 rounded-xl bg-white/90 border flex items-center justify-center shadow-sm">
              <Icon className="w-8 h-8 text-gray-800" />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] px-2 py-[2px] rounded-full bg-gray-900 text-white">
              {label}
            </div>
          </div>

          <div className="mt-4 max-w-[240px] text-center text-white/90 text-sm line-clamp-2 px-3">
            {filename}
          </div>
        </div>
      );
    }

    return (
      <div className="w-[300px] h-[200px] rounded shadow bg-black/10 flex flex-col items-center justify-center text-white/90 px-3 text-center">
        <FileIcon className="w-6 h-6 mb-2" />
        <div className="text-sm line-clamp-2">{pin.title || "File"}</div>
      </div>
    );
  };

  const renderDetail = (pin: Pin | undefined) => {
    if (!pin) return null;

    const preview = getPreviewSrc(pin);
    const favicon = getFavicon(pin);

    if (pin.kind === "image" && (preview || pin.file)) {
      return (
        <Image
          src={preview || pin.file!}
          alt={pin.title || "Image"}
          width={1400}
          height={900}
          className="max-h-[85vh] w-auto object-contain rounded"
        />
      );
    }

    if (pin.kind === "video") {
      if (isMp4File(pin)) {
        return (
          <video
            src={pin.file!}
            className="max-h-[85vh] w-auto rounded"
            controls
            autoPlay
            playsInline
            poster={pin.thumbnail || undefined}
          />
        );
      }
      if (preview) {
        return (
          <div className="relative max-h-[85vh] w-full flex items-center justify-center">
            <Image
              src={preview}
              alt={pin.title || "Video"}
              width={1400}
              height={900}
              className="max-h-[85vh] w-auto object-contain rounded"
            />
          </div>
        );
      }
      return (
        <button
          onClick={() => openLink(pin.url!)}
          className="px-4 py-2 rounded bg-white text-black hover:bg-gray-200"
        >
          Open video
        </button>
      );
    }

    if (pin.kind === "link") {
      if (preview) {
        return (
          <div className="flex flex-col items-center gap-4">
            <Image
              src={preview}
              alt={pin.title || "Link"}
              width={1400}
              height={900}
              className="max-h-[70vh] w-auto object-contain rounded"
            />
            {pin.url && (
              <button
                onClick={() => openLink(pin.url!)}
                className="px-4 py-2 rounded bg-white text-black hover:bg-gray-200"
              >
                Open link
              </button>
            )}
          </div>
        );
      }
      if (favicon) {
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <Image
                src={favicon}
                alt="favicon"
                width={32}
                height={32}
                className="rounded"
                unoptimized
              />

              <div className="text-white text-lg max-w-3xl text-center break-words">
                {pin.title || pin.url}
              </div>
            </div>
            {pin.url && (
              <button
                onClick={() => openLink(pin.url!)}
                className="px-4 py-2 rounded bg-white text-black hover:bg-gray-200"
              >
                Open link
              </button>
            )}
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="text-white text-lg max-w-3xl text-center break-words">
            {pin.title || pin.url}
          </div>
          {pin.url && (
            <button
              onClick={() => openLink(pin.url!)}
              className="px-4 py-2 rounded bg-white text-black hover:bg-gray-200"
            >
              Open link
            </button>
          )}
        </div>
      );
    }

    if (pin.kind === "file") {
      const href = pin.file || pin.url || undefined;
      const ext = getExt(pin);
      const label = getFileLabel(ext);
      const Icon = getFileIconByExt(ext);
      const filename = pin.title || getPrimaryText(pin);

      // ✅ use the same style as BuildPinForm: <embed> for PDFs
      // ✅ Prefer backend-generated thumbnail (works everywhere)
      if (preview) {
        return (
          <div className="flex flex-col items-center gap-4">
            <Image
              src={preview}
              alt={filename}
              width={1400}
              height={900}
              className="max-h-[80vh] w-auto object-contain rounded bg-white"
            />
            {href && (
              <button
                onClick={() => openLink(href)}
                className="px-4 py-2 rounded bg-white text-black hover:bg-gray-200"
              >
                Open file
              </button>
            )}
          </div>
        );
      }

      // Audio preview
      if (href && isAudio(pin)) {
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="text-white/90 text-lg text-center max-w-3xl break-words">
              {filename}
            </div>
            <audio controls src={href} className="w-[min(720px,90vw)]" />
            <button
              onClick={() => openLink(href)}
              className="px-4 py-2 rounded bg-white text-black hover:bg-gray-200"
            >
              Open audio
            </button>
          </div>
        );
      }

      // Image files uploaded as "file"
      if (href && isImageFile(pin)) {
        // use <img> to avoid next/image remote domain config issues
        return (
          <div className="flex flex-col items-center gap-4">
            <Image
              src={href}
              alt={filename}
              width={1400}
              height={900}
              className="max-h-[85vh] w-auto object-contain rounded"
              unoptimized
            />

            <button
              onClick={() => openLink(href)}
              className="px-4 py-2 rounded bg-white text-black hover:bg-gray-200"
            >
              Open image
            </button>
          </div>
        );
      }

      // Fallback: tile + open
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-24 rounded-2xl bg-white/90 border flex items-center justify-center shadow-sm">
              <Icon className="w-10 h-10 text-gray-800" />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] px-2 py-[2px] rounded-full bg-gray-900 text-white">
              {label}
            </div>
          </div>

          <div className="text-white/90 text-lg max-w-3xl text-center break-words px-4">
            {filename}
          </div>

          {href && (
            <button
              onClick={() => openLink(href)}
              className="px-4 py-2 rounded bg-white text-black hover:bg-gray-200"
            >
              Open file
            </button>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 overflow-auto">
      <div className="min-h-screen flex flex-col items-center p-4 relative">
        <button
          onClick={closeViewer}
          className="fixed top-5 right-5 text-white hover:text-gray-300 z-50"
        >
          <X size={32} />
        </button>

        <button
          onClick={handlePrev}
          className="fixed left-4 top-1/2 -translate-y-1/2 text-white z-50 hover:text-gray-300"
          aria-label="Previous"
        >
          <ArrowLeft size={32} />
        </button>

        <button
          onClick={handleNext}
          className="fixed right-4 top-1/2 -translate-y-1/2 text-white z-50 hover:text-gray-300"
          aria-label="Next"
        >
          <ArrowRight size={32} />
        </button>

        <div className="w-full max-w-[90vw]">
          {showOverview ? (
            <div
              ref={gridRef}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
            >
              {pins.map((pin, i) => (
                <div
                  key={pin.id}
                  className="cursor-pointer flex justify-center items-center"
                  style={{
                    height: maxTopRowHeight ? `${maxTopRowHeight}px` : "auto",
                  }}
                  onClick={() => setIndex(i + 1)}
                >
                  {renderOverviewCell(pin)}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 min-h-[90vh] justify-center">
              {currentPin?.title ? (
                <div className="text-white/90 text-lg">{currentPin.title}</div>
              ) : null}

              {renderDetail(currentPin)}

              <div className="text-white/60 text-sm max-w-3xl text-center px-4">
                {currentPin?.description}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
