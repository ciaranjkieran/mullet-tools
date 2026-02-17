"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useUpdatePin } from "@shared/api/hooks/boards/useUpdatePin";
import { useDeletePin } from "@shared/api/hooks/boards/useDeletePin";
import { usePinsByMode } from "@shared/api/hooks/boards/usePinsByMode";
import { useEditPinDialogStore } from "../../../lib/dialogs/useEditPinDialogStore";
import { getContrastingText } from "@shared/utils/getContrastingText";
import ConfirmDialog from "../../../lib/utils/ConfirmDialog";
import type { Pin, PinKind } from "@shared/types/Pin";
import type { Mode } from "@shared/types/Mode";
import EditorModeSelect from "../../inputs/editor/EditorModeSelect";

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
  modes?: Mode[];
  modeColor: string; // fallback
};

function resolvePinModeId(pin: Pin | null | undefined): number {
  if (!pin) return 0;

  const direct = (pin as Record<string, unknown> | null | undefined)?.modeId;

  if (typeof direct === "number") return direct;

  if (
    typeof direct === "string" &&
    direct.trim() !== "" &&
    !Number.isNaN(Number(direct))
  ) {
    return Number(direct);
  }

  // some endpoints might send `mode` as an id
  const legacy = (pin as Partial<Pin> & { mode?: unknown }).mode;
  if (typeof legacy === "number") return legacy;
  if (
    typeof legacy === "string" &&
    legacy.trim() !== "" &&
    !Number.isNaN(Number(legacy))
  ) {
    return Number(legacy);
  }

  return 0;
}

export default function EditPinDialog({ modes, modeColor }: Props) {
  const { isOpen, pin, close } = useEditPinDialogStore();

  const safeModes = useMemo<Mode[]>(() => modes ?? [], [modes]);

  // keep list in cache fresh elsewhere
  const pinModeId = useMemo(() => resolvePinModeId(pin ?? null), [pin]);
  usePinsByMode(pinModeId);

  const [modeId, setModeId] = useState<number>(pinModeId);
  const [title, setTitle] = useState("");

  // replace content
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const updatePin = useUpdatePin();
  const deletePin = useDeletePin();

  useEffect(() => {
    if (isOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  // initialize when pin changes
  useEffect(() => {
    if (!pin) return;

    setTitle(pin.title || "");
    setModeId(resolvePinModeId(pin));
    setUrl(pin.url || "");
    setFile(null);
  }, [pin]);

  // keep modeId valid if modes list changes
  useEffect(() => {
    if (!safeModes.length) return;
    const hasValid = safeModes.some((m) => m.id === modeId);
    if (!hasValid) setModeId(safeModes[0].id);
  }, [safeModes, modeId]);

  const selectedMode = useMemo(
    () => safeModes.find((m) => m.id === modeId),
    [safeModes, modeId]
  );

  const resolvedModeColor = selectedMode?.color || modeColor || "#0ea5e9";
  const primaryText = useMemo(
    () => getContrastingText(resolvedModeColor),
    [resolvedModeColor]
  );

  const handleClose = useCallback(() => close(), [close]);

  const handleSubmit = useCallback(async () => {
    if (!pin) return;

    await updatePin.mutateAsync({
      id: String(pin.id),
      data: {
        title,
        mode: modeId,
        url: url.trim() ? url.trim() : undefined,
        file: file ?? undefined,
      },
    });

    handleClose();
  }, [pin, updatePin, title, modeId, url, file, handleClose]);

  const handleConfirmDelete = useCallback(async () => {
    if (!pin) return;
    await deletePin.mutateAsync(String(pin.id));
    handleClose();
  }, [pin, deletePin, handleClose]);

  const onPickFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.currentTarget.files?.[0] ?? null;
    setFile(f);
  }, []);

  function renderPreview(p: Pin | null) {
    if (!p) return null;

    if (p.kind === "image" && p.file) {
      const src = p.thumbnail || p.file;
      return (
        <div className="relative max-h-56 w-full overflow-hidden rounded-md bg-white">
          <Image
            src={src}
            alt={p.title || "preview"}
            width={1400}
            height={900}
            className="max-h-56 w-full object-contain rounded-md bg-white"
            sizes="(max-width: 768px) 90vw, 768px"
            unoptimized
          />
        </div>
      );
    }

    if (p.kind === "video") {
      if (p.file && /\.(mp4|webm|ogg)$/i.test(p.file)) {
        return (
          <video
            src={p.file}
            className="max-h-56 w-full rounded-md bg-black"
            controls
          />
        );
      }
      return (
        <div className="h-40 rounded-md bg-gray-100 grid place-items-center text-sm text-gray-600">
          Video
        </div>
      );
    }

    if (p.kind === "link") {
      return (
        <div className="h-28 rounded-md bg-gray-50 p-3">
          <div className="text-sm font-medium line-clamp-2">
            {p.title || p.url}
          </div>
          {p.url ? (
            <div className="text-xs text-gray-500 mt-1 break-all">{p.url}</div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="h-28 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
        {p.title || p.file || "File"}
      </div>
    );
  }

  const kind = pin?.kind;

  // Only allow manual mode change for pins flat to a mode (not attached to an entity)
  const isFlatToMode =
    !pin?.content_type || pin.content_type === "mode";

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={(v) => !v && handleClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />

          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl h-[85vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col">
            <div
              className="h-1.5 md:h-4 w-full"
              style={{ backgroundColor: resolvedModeColor, opacity: 0.3 }}
            />
            <div
              className="absolute left-0 top-0 h-full w-1.5 md:w-2"
              style={{ backgroundColor: resolvedModeColor, opacity: 0.5 }}
            />

            <div
              className="flex items-start justify-between px-6 pt-5 pb-4 md:px-10 border-b-2 shrink-0"
              style={{ borderBottomColor: `${resolvedModeColor}` }}
            >
              <div className="min-w-0">
                <Dialog.Title className="text-2xl font-semibold tracking-tight text-gray-900">
                  Edit Pin
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-gray-500">
                  {isFlatToMode
                    ? "Update the pin title, move it to another mode, or replace its content."
                    : "Update the pin title or replace its content."}
                </Dialog.Description>
              </div>

              <Dialog.Close
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <div className="px-6 py-6 md:px-10 overflow-y-auto flex-1">
              <div className="grid gap-6">
                {renderPreview(pin || null)}

                {isFlatToMode && (
                  <div className="max-w-xl">
                    <EditorModeSelect
                      modes={safeModes}
                      modeId={modeId}
                      onChange={(id) => setModeId(id)}
                      modeColor={resolvedModeColor}
                      variant="edit"
                    />
                  </div>
                )}

                <div className="max-w-xl grid gap-2">
                  <label className="text-sm font-semibold text-gray-900">
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="Optional title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>

                <div className="max-w-xl grid gap-3">
                  <div className="text-sm font-semibold text-gray-900">
                    Replace content
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-800">
                      URL {kind === "link" ? "" : "(optional)"}
                    </label>
                    <input
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      placeholder={kind === "link" ? "https://…" : "https://…"}
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      disabled={
                        updatePin.isPending || (!!file && kind !== "link")
                      }
                    />
                    {!!file && kind !== "link" && (
                      <div className="text-xs text-gray-500">
                        URL disabled while a file is selected.
                      </div>
                    )}
                  </div>

                  {kind && kind !== "link" && (
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-gray-800">
                        File (optional)
                      </label>

                      <div className="flex items-center gap-3">
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold bg-black text-white border-black">
                          Choose File
                          <input
                            type="file"
                            onChange={onPickFile}
                            accept={ACCEPT_BY_KIND[kind]}
                            disabled={updatePin.isPending}
                            className="hidden"
                          />
                        </label>

                        <span className="text-sm text-gray-500 truncate">
                          {file ? file.name : "No new file selected"}
                        </span>

                        {file && (
                          <button
                            type="button"
                            className="text-sm underline text-gray-600 hover:text-gray-900"
                            onClick={() => setFile(null)}
                            disabled={updatePin.isPending}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div
              className="border-t-2 px-6 pt-5 pb-10 md:px-10 md:pt-6 md:pb-12 bg-white shrink-0"
              style={{ borderTopColor: `${resolvedModeColor}22` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmit}
                    className="px-5 py-2 text-sm font-semibold rounded-md hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: resolvedModeColor,
                      color: primaryText,
                    }}
                    disabled={updatePin.isPending}
                  >
                    {updatePin.isPending ? "Saving…" : "Save Changes"}
                  </button>

                  <button
                    onClick={handleClose}
                    className="px-4 py-2 rounded-md border text-sm font-semibold hover:bg-gray-50 transition"
                    disabled={updatePin.isPending}
                  >
                    Cancel
                  </button>
                </div>

                <button
                  onClick={() => setConfirmOpen(true)}
                  className="text-sm underline font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
                  disabled={deletePin.isPending}
                >
                  {deletePin.isPending ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete this pin?"
        description="This action cannot be undone. The pin will be permanently deleted."
        confirmText={deletePin.isPending ? "Deleting…" : "Delete"}
        cancelText="Cancel"
      />
    </>
  );
}
