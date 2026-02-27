"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useEffect, useMemo } from "react";

import { useCreateMode } from "@shared/api/hooks/modes/useCreateMode";
import { useDeleteMode } from "@shared/api/hooks/modes/useDeleteMode";
import { useUpdateMode } from "@shared/api/hooks/modes/useUpdateMode";
import { useReorderModes } from "@shared/api/hooks/modes/useReorderModes";

import { useModeStore } from "@shared/store/useModeStore";
import { Mode } from "@shared/types/Mode";

import ColorPickerPopover from "@/lib/utils/ColorPickerPopover";
import ConfirmDialog from "@/lib/utils/ConfirmDialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  modes: Mode[];
}

// Local-only ids so we can add new modes before the backend returns a number id
type TempModeId = `temp-${number}`;
type ModeId = number | TempModeId;
type LocalMode = Omit<Mode, "id"> & { id: ModeId };

function isTempModeId(id: ModeId): id is TempModeId {
  return typeof id === "string" && id.startsWith("temp-");
}

function isRealModeId(id: ModeId): id is number {
  return typeof id === "number";
}

function isTempMode(m: LocalMode): m is LocalMode & { id: TempModeId } {
  return isTempModeId(m.id);
}

function isRealMode(m: LocalMode): m is LocalMode & { id: number } {
  return isRealModeId(m.id);
}

export default function EditModesModal({ isOpen, onClose, modes }: Props) {
  const [localModes, setLocalModes] = useState<LocalMode[]>([]);
  const [initialModes, setInitialModes] = useState<Mode[]>([]);
  const [newModeName, setNewModeName] = useState("");
  const [newModeColor, setNewModeColor] = useState("#000000");
  const [showConfirmId, setShowConfirmId] = useState<ModeId | null>(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  const createMode = useCreateMode();
  const deleteMode = useDeleteMode();
  const updateMode = useUpdateMode();
  const reorderModes = useReorderModes();

  const { addMode, deleteMode: deleteModeStore } = useModeStore();

  const isDirty = useMemo(() => {
    if (localModes.length !== initialModes.length) return true;

    const m1 = new Map(localModes.map((m) => [String(m.id), m]));
    const m0 = new Map(initialModes.map((m) => [String(m.id), m]));

    for (const [id, orig] of m0.entries()) {
      const curr = m1.get(id);
      if (!curr) return true;
      if (orig.title !== curr.title) return true;
      if (orig.color !== curr.color) return true;
      if ((orig.position ?? 0) !== (curr.position ?? 0)) return true;
    }

    return false;
  }, [localModes, initialModes]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");

      const clone = modes.map((m, i) => ({ ...m, position: m.position ?? i }));
      setLocalModes(clone);
      setInitialModes(clone.map((m) => ({ ...m })));

      setNewModeName("");
      setNewModeColor("#000000");
      setShowUnsavedConfirm(false);
      setShowConfirmId(null);
    } else {
      document.body.classList.remove("modal-open");
    }

    return () => document.body.classList.remove("modal-open");
  }, [isOpen, modes]);

  const handleRequestClose = (open: boolean) => {
    if (!open) {
      if (isDirty) {
        setShowUnsavedConfirm(true);
        return;
      }
      onClose();
    }
  };

  const handleChange = (
    id: ModeId,
    field: "title" | "color",
    value: string
  ) => {
    setLocalModes((prev) =>
      prev.map((mode) =>
        String(mode.id) === String(id) ? { ...mode, [field]: value } : mode
      )
    );
  };

  const handleDelete = (id: ModeId) => {
    setLocalModes((prev) =>
      prev.filter((mode) => String(mode.id) !== String(id))
    );
  };

  const handleAddNewMode = () => {
    if (!newModeName.trim()) return;

    const tempId: TempModeId = `temp-${Date.now()}`;
    const nextPosition =
      localModes.length > 0
        ? Math.max(...localModes.map((m) => m.position ?? -1)) + 1
        : 0;

    const newMode: LocalMode = {
      id: tempId,
      title: newModeName.trim(),
      color: newModeColor,
      position: nextPosition,
      isOwned: true,
      collaboratorCount: 0,
      ownerName: null,
    };

    setLocalModes((prev) => [...prev, newMode]);
    setNewModeName("");
    setNewModeColor("#000000");
  };

  const resetToInitial = () => {
    setLocalModes(initialModes.map((m) => ({ ...m })));
    setNewModeName("");
    setNewModeColor("#000000");
    setShowConfirmId(null);
  };

  const handleCancelChanges = () => {
    resetToInitial();
  };

  function moveMode(id: ModeId, delta: number) {
    setLocalModes((prev) => {
      const idx = prev.findIndex((m) => String(m.id) === String(id));
      if (idx === -1) return prev;

      const newIndex = idx + delta;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(newIndex, 0, item);

      return next.map((m, i) => ({ ...m, position: i }));
    });
  }

  const handleSaveChanges = async () => {
    const initialById = new Map(initialModes.map((m) => [String(m.id), m]));

    // 1) deletions (only real ids exist in initialModes)
    const deleted = initialModes.filter(
      (im) => !localModes.find((lm) => String(lm.id) === String(im.id))
    );
    for (const m of deleted) {
      await deleteMode.mutateAsync(m.id);
      deleteModeStore(m.id);
    }

    // 2) creations (temp ids)
    const tempToReal = new Map<TempModeId, number>();
    const added = localModes.filter(isTempMode);

    for (const m of added) {
      const created = await createMode.mutateAsync({
        title: m.title,
        color: m.color,
        position: m.position ?? 0,
      });

      const tempToReal = new Map<TempModeId, number>();

      addMode({
        id: created.id,
        title: created.title,
        color: created.color,
        position:
          typeof created.position === "number" ? created.position : m.position,
        isOwned: true,
        collaboratorCount: 0,
        ownerName: null,
      });
    }

    // 3) resolve temp ids to real ids for subsequent updates/reorder
    const resolvedLocal: LocalMode[] = localModes.map((m) => {
      if (isTempModeId(m.id)) {
        const real = tempToReal.get(m.id);
        return real != null ? { ...m, id: real } : m;
      }
      return m;
    });

    // 4) updates (only for real ids)
    for (const m of resolvedLocal) {
      if (!isRealModeId(m.id)) continue;

      const orig = initialById.get(String(m.id));
      const titleChanged = orig?.title !== m.title;
      const colorChanged = orig?.color !== m.color;

      if (titleChanged || colorChanged) {
        await updateMode.mutateAsync({
          id: m.id,
          title: m.title,
          color: m.color,
        });
      }
    }

    // 5) reorder (only real ids)
    const existing = resolvedLocal.filter(isRealMode);
    const orders = existing.map((m, idx) => ({ id: m.id, position: idx }));

    if (orders.length) {
      await reorderModes.mutateAsync({ orders });
    }

    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleRequestClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                     bg-neutral-100 border border-gray-300 p-6 md:p-8 rounded-xl shadow-xl 
                     w-full max-w-md z-50"
        >
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Edit Modes</h2>
            <Dialog.Close asChild>
              <button
                className="px-3 py-1 text-sm font-semibold rounded-md
               bg-gray-700 text-white 
               hover:bg-white hover:text-gray-800 hover:border-gray-400 
               border border-transparent hover:border-gray-400
               active:bg-gray-200 active:text-gray-900
               shadow-sm transition-colors"
              >
                Close
              </button>
            </Dialog.Close>
          </div>

          <div className="max-h-[50vh] overflow-y-auto pr-1 bg-neutral-100">
            <ul className="divide-y divide-gray-200">
              {localModes.map((mode, index) => (
                <li key={String(mode.id)} className="py-2">
                  <div className="grid grid-cols-[2.5rem_1fr_2.5rem_3.5rem] gap-3 items-center">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveMode(mode.id, -1)}
                        disabled={index === 0}
                        className="h-6 w-6 flex items-center justify-center rounded 
                          bg-gray-700 text-white border border-transparent
                          hover:bg-white hover:text-gray-800 hover:border-gray-400
                          active:bg-gray-200 active:text-gray-900
                          shadow-sm transition-colors disabled:opacity-40"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveMode(mode.id, +1)}
                        disabled={index === localModes.length - 1}
                        className="h-6 w-6 flex items-center justify-center rounded 
                          bg-gray-700 text-white border border-transparent
                          hover:bg-white hover:text-gray-800 hover:border-gray-400
                          active:bg-gray-200 active:text-gray-900
                          shadow-sm transition-colors disabled:opacity-40"
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>

                    <input
                      type="text"
                      value={mode.title}
                      onChange={(e) =>
                        handleChange(mode.id, "title", e.target.value)
                      }
                      className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-gray-800 font-semibold"
                    />

                    <ColorPickerPopover
                      initialColor={mode.color}
                      onSelect={(color) =>
                        handleChange(mode.id, "color", color)
                      }
                    />

                    <div>
                      <button
                        onClick={() => setShowConfirmId(mode.id)}
                        className="text-sm text-red-600 hover:underline font-semibold w-full text-left"
                      >
                        Delete
                      </button>

                      <ConfirmDialog
                        open={showConfirmId === mode.id}
                        onClose={() => setShowConfirmId(null)}
                        onConfirm={() => {
                          handleDelete(mode.id);
                          setShowConfirmId(null);
                        }}
                        title={`Delete mode "${mode.title}"?`}
                        description={
                          <p className="text-sm text-gray-1000">
                            <span className="font-semibold">
                              All items listed under this mode will also be
                              deleted.
                            </span>{" "}
                            This action cannot be undone.
                          </p>
                        }
                        confirmText="Delete"
                        cancelText="Cancel"
                      />
                    </div>
                  </div>
                </li>
              ))}

              <li className="py-2">
                <div className="grid grid-cols-[2.5rem_1fr_2.5rem_3.5rem] gap-3 items-center">
                  <div />
                  <input
                    type="text"
                    value={newModeName}
                    onChange={(e) => setNewModeName(e.target.value)}
                    placeholder="New mode name"
                    className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-gray-800 font-semibold"
                  />
                  <ColorPickerPopover
                    initialColor={newModeColor}
                    onSelect={(color) => setNewModeColor(color)}
                  />
                  <button
                    onClick={handleAddNewMode}
                    className="text-md text-blue-900 hover:underline font-semibold"
                  >
                    ＋ Add
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <hr className="my-6 border-t border-gray-600" />

          <div className="flex items-center justify-between mt-2">
            <div>
              {isDirty && (
                <button
                  onClick={handleCancelChanges}
                  className="px-4 py-2 text-sm font-semibold rounded-md border border-red-600 text-red-700 hover:bg-red-50"
                >
                  Cancel Changes
                </button>
              )}
            </div>
            <button
              onClick={handleSaveChanges}
              disabled={!isDirty}
              className={`px-5 py-2 text-sm font-semibold rounded-md text-white shadow-sm
                ${
                  isDirty
                    ? "bg-black hover:bg-gray-800"
                    : "bg-gray-300 cursor-not-allowed"
                }
              `}
              aria-disabled={!isDirty}
            >
              Save Changes
            </button>
          </div>

          <ConfirmDialog
            open={showUnsavedConfirm}
            onClose={() => setShowUnsavedConfirm(false)}
            onConfirm={() => {
              resetToInitial();
              setShowUnsavedConfirm(false);
              onClose();
            }}
            title="Discard unsaved changes?"
            description={
              <p className="text-sm text-gray-1000">
                You have unsaved edits to modes. If you close now, these changes
                will be lost.
              </p>
            }
            confirmText="Discard"
            cancelText="Keep Editing"
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
