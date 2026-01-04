// components/template/milestone/BuildMilestoneTemplateWindow.tsx
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useEffect, useRef } from "react";
import { Mode } from "@shared/types/Mode";
import { useCreateTemplate } from "@shared/api/hooks/templates/useCreateTemplate";
import {
  CreateTemplateInput,
  TemplateMilestoneData,
} from "@shared/types/Template";
import MilestoneEditor from "./MilestoneEditor";
import EditorModeSelect from "../../inputs/editor/EditorModeSelect";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modes: Mode[];
  modeColor: string;
  /** Prefill support */
  prefillNode?: TemplateMilestoneData;
  prefillModeId?: number | null;
  /** Optional callback once the modal fully closes */
  onAfterClose?: () => void;
};

const EMPTY_MILESTONE: TemplateMilestoneData = {
  title: "",
  tasks: [],
  subMilestones: [],
};

export default function BuildMilestoneTemplateWindow({
  open: isOpen,
  onOpenChange,
  modes,
  modeColor,
  prefillNode,
  prefillModeId,
  onAfterClose,
}: Props) {
  const [milestone, setMilestone] =
    useState<TemplateMilestoneData>(EMPTY_MILESTONE);
  const [modeId, setModeId] = useState<number | null>(null);

  const createTemplate = useCreateTemplate();
  const actionTriggered = useRef(false);

  // Body class for modal scroll lock
  useEffect(() => {
    if (isOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    setMilestone(prefillNode ?? EMPTY_MILESTONE);

    if (prefillModeId != null) {
      setModeId(prefillModeId);
    } else if (modes.length) {
      setModeId(modes[0].id);
    }
  }, [isOpen, prefillNode, prefillModeId, modes]);

  const handleSubmit = async () => {
    if (actionTriggered.current) return;
    actionTriggered.current = true;

    const effectiveModeId = modeId ?? (modes.length ? modes[0].id : null);

    if (!milestone.title || !effectiveModeId) {
      actionTriggered.current = false;
      return;
    }

    const template: CreateTemplateInput = {
      title: milestone.title,
      type: "milestone",
      mode: effectiveModeId,
      data: milestone,
    };

    try {
      await createTemplate.mutateAsync(template);
      internalClose(false);
    } catch (err: any) {
      console.error("Template creation failed:", err?.response?.data || err);
      alert("Something went wrong while creating the template.");
    } finally {
      actionTriggered.current = false;
    }
  };

  const internalClose = (open: boolean) => {
    if (!open) {
      // Reset local state so next open re-syncs with selectedMode (via prefillModeId)
      setModeId(null);
      setMilestone(EMPTY_MILESTONE);
      onAfterClose?.();
    }

    onOpenChange(open);
  };

  const effectiveMode =
    modes.find((m) => m.id === modeId) ??
    (prefillModeId != null
      ? modes.find((m) => m.id === prefillModeId)
      : modes[0]);

  const effectiveModeColor = effectiveMode?.color ?? modeColor;
  const effectiveModeId =
    modeId ?? prefillModeId ?? (modes.length ? modes[0].id : 0);

  return (
    <Dialog.Root open={isOpen} onOpenChange={internalClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-16 z-50 w-full max-w-2xl -translate-x-1/2 rounded-2xl bg-white shadow-xl focus:outline-none max-h-[90vh] overflow-y-auto">
          {/* Top Strip */}
          <div
            className="h-3 rounded-t-2xl"
            style={{ backgroundColor: effectiveModeColor }}
          />
          <div className="p-8 space-y-8">
            {/* Template Title */}
            <div className="flex items-center gap-4">
              <span
                className="inline-block"
                style={{
                  borderBottom: "0",
                  borderTop: `28px solid ${effectiveModeColor}`,
                  borderLeft: "18px solid transparent",
                  borderRight: "18px solid transparent",
                  width: 0,
                  height: 0,
                }}
              />
              <input
                type="text"
                value={milestone.title}
                onChange={(e) =>
                  setMilestone({ ...milestone, title: e.target.value })
                }
                placeholder="New Milestone Template Title"
                className="w-full text-2xl font-bold tracking-tight placeholder-gray-400 focus:outline-none border-none bg-transparent"
              />
            </div>

            {/* Mode Picker – drives local colour only */}
            {modes.length > 0 && (
              <EditorModeSelect
                modes={modes}
                modeId={effectiveModeId}
                modeColor={effectiveModeColor}
                onChange={(id) => setModeId(id)}
              />
            )}

            {/* Recursive Milestone Editor */}
            <MilestoneEditor
              node={milestone}
              onChange={setMilestone}
              modeColor={effectiveModeColor}
            />

            {/* Submit */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleSubmit}
                className="px-5 py-2 rounded-md text-white text-sm font-medium shadow"
                style={{ backgroundColor: effectiveModeColor }}
              >
                Create Template
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
