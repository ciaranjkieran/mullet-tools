"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMemo } from "react";
import { X } from "lucide-react";
import { usePinDialogStore } from "@/lib/dialogs/usePinDialogStore";
import BuildPinForm from "./BuildPinForm";

export default function BuildPinWindow() {
  const { isOpen, close, modeId, entity, entityId, modeColor } =
    usePinDialogStore();

  const resolvedModeColor = modeColor || "#0ea5e9";
  const resolvedModeId = Number(modeId ?? 0);

  const initialEntity = useMemo(() => {
    if (!entity || entityId == null) return null;
    if (entity === "mode") return { type: "mode" as const, id: Number(modeId) };
    return {
      type: entity as "task" | "milestone" | "project" | "goal",
      id: Number(entityId),
    };
  }, [entity, entityId, modeId]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(o) => (!o ? close() : null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />

        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-2xl">
          {/* Top bar + left rail like BuildTask */}
          <div
            className="h-1.5 md:h-4 w-full"
            style={{ backgroundColor: resolvedModeColor, opacity: 0.3 }}
          />
          <div
            className="absolute left-0 top-0 h-full w-1.5 md:w-2"
            style={{ backgroundColor: resolvedModeColor, opacity: 0.5 }}
          />

          {/* Header */}
          <div
            className="flex items-start justify-between px-6 pt-5 pb-4 md:px-1a0 border-b-4"
            style={{ borderBottomColor: `${resolvedModeColor}` }} // ~20% opacity
          >
            <div className="min-w-0">
              <Dialog.Title className="text-2xl font-bold tracking-tight text-gray-900">
                Add Pin
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-gray-500">
                Attach an image, video, file, or link to this item.
              </Dialog.Description>
            </div>

            <Dialog.Close
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="px-6 py-5 md:px-10 overflow-y-auto max-h-[calc(90vh-110px)]">
            {initialEntity && resolvedModeId ? (
              <BuildPinForm
                modeId={resolvedModeId}
                initialEntity={initialEntity}
                onClose={close}
                modeColor={resolvedModeColor}
              />
            ) : (
              <div className="text-sm text-gray-500 py-6">Loading…</div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
