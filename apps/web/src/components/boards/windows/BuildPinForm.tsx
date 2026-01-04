"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCreatePin } from "@shared/api/hooks/boards/useCreatePin";
import type { CreatePinInput, PinKind } from "@shared/types/Pin";

const ACCEPT_BY_KIND: Record<Exclude<PinKind, "link">, string> = {
  image: "image/*",
  video: "video/*",
  file: [
    ".pdf",
    ".doc",
    ".docx",
    ".rtf",
    ".odt",
    ".xls",
    ".xlsx",
    ".csv",
    ".ppt",
    ".pptx",
    ".txt",
    ".md",
    ".json",
    ".zip",
    ".rar",
    ".7z",
    ".tar",
    ".gz",
  ].join(","),
};

type Props = {
  modeId: number;
  initialEntity:
    | { type: "mode"; id: number }
    | { type: "task" | "milestone" | "project" | "goal"; id: number };
  onClose: () => void;
  modeColor?: string;
};

const yt = /(?:youtube\.com\/.*[?&]v=|youtu\.be\/)([^&?/]+)/i;

function looksLikeImage(u: string) {
  return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(u);
}
function isPdfName(n?: string) {
  return !!n && /\.pdf$/i.test(n);
}
function faviconFor(url: string) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`;
  } catch {
    return "";
  }
}
function youtubeThumb(url: string) {
  const m = url.match(yt);
  return m?.[1] ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : "";
}

export default function BuildPinForm({
  modeId,
  initialEntity,
  onClose,
  modeColor = "#0ea5e9",
}: Props) {
  const [kind, setKind] = useState<PinKind>("image");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { mutateAsync, isPending } = useCreatePin();

  const urlRef = useRef<HTMLInputElement | null>(null);

  const localPreview = useMemo(
    () => (file ? URL.createObjectURL(file) : ""),
    [file]
  );

  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    },
    [localPreview]
  );

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.currentTarget.files?.[0] ?? null;
    setFile(f);
    if (f && kind !== "link") setUrl("");
  }

  function onChangeKind(next: PinKind) {
    setKind(next);

    if (next === "link") {
      setFile(null);
      // focus URL to make the flow feel intentional
      requestAnimationFrame(() => urlRef.current?.focus());
    } else {
      setUrl("");
    }
  }

  const canSave =
    kind === "link"
      ? Boolean(url.trim())
      : Boolean(file) || Boolean(url.trim());

  async function onSubmit() {
    if (!canSave || isPending) return;

    const payload: CreatePinInput = {
      kind,
      modeId,
      entity: initialEntity.type,
      entityId: initialEntity.id,
      title: title || undefined,
      url: url || undefined,
      file: file || undefined,
    };

    await mutateAsync(payload);
    onClose();
  }

  function Preview() {
    if (kind === "image") {
      const src = file ? localPreview : url && looksLikeImage(url) ? url : "";
      if (!src) return null;
      return (
        <img
          src={src}
          alt="preview"
          className="max-h-64 w-full object-contain rounded-md border bg-white"
        />
      );
    }

    if (kind === "video") {
      if (file) {
        return (
          <video
            src={localPreview}
            className="max-h-64 w-full rounded-md border bg-white"
            controls
            playsInline
          />
        );
      }
      if (url) {
        const y = youtubeThumb(url);
        if (y) {
          return (
            <img
              src={y}
              alt="video"
              className="max-h-64 w-full object-contain rounded-md border bg-white"
            />
          );
        }
        return (
          <div className="w-full rounded-md border bg-white p-4 text-sm text-gray-600">
            {url}
          </div>
        );
      }
      return null;
    }

    if (kind === "file") {
      if (file) {
        if (isPdfName(file.name)) {
          return (
            <embed
              src={localPreview}
              type="application/pdf"
              className="w-full h-64 rounded-md border bg-white"
            />
          );
        }
        return (
          <div className="w-full rounded-md border bg-white p-4 text-sm text-gray-700 flex items-center gap-2">
            <span className="inline-block rounded bg-gray-200 px-2 py-1 text-xs">
              File
            </span>
            <span className="truncate">{file.name}</span>
          </div>
        );
      }

      if (url) {
        if (isPdfName(url)) {
          return (
            <embed
              src={url}
              type="application/pdf"
              className="w-full h-64 rounded-md border bg-white"
            />
          );
        }
        return (
          <div className="w-full rounded-md border bg-white p-4 text-sm text-gray-600">
            {url}
          </div>
        );
      }

      return null;
    }

    if (kind === "link") {
      if (!url) return null;
      const fav = faviconFor(url);
      const y = youtubeThumb(url);
      return (
        <div className="w-full rounded-md border bg-white p-3 flex items-center gap-3">
          {y ? (
            <img
              src={y}
              alt="link"
              className="h-12 w-20 object-cover rounded"
            />
          ) : fav ? (
            <img src={fav} alt="favicon" className="h-6 w-6 rounded" />
          ) : null}
          <div className="text-sm break-all">{url}</div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Type */}
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-gray-900">Type</span>
          <span className="text-xs text-gray-500">
            Selected:{" "}
            <span className="font-medium text-gray-800 capitalize">{kind}</span>
          </span>
        </div>

        {/* Segmented control */}
        <div className="inline-flex w-full rounded-lg border bg-gray-50 p-1">
          {(["image", "video", "file", "link"] as PinKind[]).map((k) => {
            const active = k === kind;

            return (
              <button
                key={k}
                type="button"
                onClick={() => onChangeKind(k)}
                disabled={isPending}
                className={[
                  "flex-1 rounded-md px-3 py-2 text-base font-semibold capitalize transition",
                  active ? "bg-white" : "text-gray-600 hover:text-gray-900",
                ].join(" ")}
                style={
                  active
                    ? { color: modeColor, border: `2px solid ${modeColor}` }
                    : { border: "2px solid transparent" }
                }
              >
                {k}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fields */}
      <div className="mt-5 grid gap-5">
        {/* Title */}
        <div className="max-w-xl">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-gray-900">
                Title
              </label>
              <input
                className="w-full rounded-md border px-3 py-2"
                placeholder="Optional"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
        </div>

        {/* URL (highlight when Link) */}
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-gray-900">
            {kind === "link" ? "URL" : "URL (for links)"}
          </label>
          <input
            ref={urlRef}
            className={[
              "w-full rounded-md border px-3 py-2 outline-none transition",
              isPending || (kind !== "link" && !!file)
                ? "bg-gray-50 text-gray-500"
                : "bg-white",
            ].join(" ")}
            style={
              kind === "link"
                ? {
                    borderColor: modeColor,
                    boxShadow: `0 0 0 3px ${modeColor}22`,
                  }
                : undefined
            }
            placeholder={kind === "link" ? "https://…" : "https://… "}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isPending || (kind !== "link" && !!file)}
          />
          {kind !== "link" && file && (
            <div className="text-xs text-gray-500">
              URL disabled while a file is selected.
            </div>
          )}
          {kind === "link" && (
            <div className="text-xs text-gray-500">
              Paste the link you want to pin.
            </div>
          )}
        </div>

        {/* File (reserved space to prevent jump) */}
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-gray-900">File</label>

          {kind === "link" ? (
            <div className="rounded-md border border-dashed px-4 py-3 text-sm text-gray-500 bg-gray-50">
              Files aren’t needed for links.
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <label
                className="inline-flex cursor-pointer items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold"
                style={{
                  backgroundColor: "#000",
                  color: "#fff",
                  borderColor: "#000",
                }}
              >
                Choose File
                <input
                  type="file"
                  onChange={onPickFile}
                  accept={ACCEPT_BY_KIND[kind as Exclude<PinKind, "link">]}
                  disabled={isPending}
                  className="hidden"
                />
              </label>
              <span className="text-sm text-gray-500 truncate">
                {file ? file.name : "No file selected"}
              </span>
            </div>
          )}
        </div>

        <Preview />
      </div>

      {/* Footer */}
      <div className="mt-6 flex justify-end gap-2 border-t pt-4">
        <button
          type="button"
          className="px-4 py-2 rounded-md border text-sm font-semibold"
          onClick={onClose}
          disabled={isPending}
        >
          Cancel
        </button>

        <button
          type="button"
          className={`px-5 py-2 rounded-md text-sm font-semibold ${
            canSave ? "" : "opacity-60 cursor-not-allowed"
          }`}
          style={{ backgroundColor: modeColor, color: "#fff" }}
          onClick={onSubmit}
          disabled={!canSave || isPending}
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
