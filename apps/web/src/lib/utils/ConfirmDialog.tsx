"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ReactNode } from "react";
import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
};

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Confirm",
}: Props) {
  // Handle body class for modal
  useEffect(() => {
    if (open) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
             bg-neutral-50 border border-red-500 rounded-lg shadow-lg 
             p-6 md:p-7 max-w-sm w-full z-50"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex gap-4">
            {/* 🔴 Red accent stripe */}
            <div className="w-1.5 rounded bg-red-500" />

            {/* 🧠 Main content */}
            <div className="flex-1">
              <Dialog.Title className="text-lg font-bold text-gray-900 mb-2">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-gray-1000 mb-6">
                {description}
              </Dialog.Description>

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="px-4 py-2 text-sm font-semibold rounded-md bg-red-600 hover:bg-red-700 text-white"
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
