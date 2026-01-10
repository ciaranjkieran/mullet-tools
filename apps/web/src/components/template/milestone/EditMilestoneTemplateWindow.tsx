"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import ModeInput from "@/components/timer/inputs/TimerModeSelect";
import type { Mode } from "@shared/types/Mode";
import type { Template, TemplateMilestoneData } from "@shared/types/Template";
import { usePatchTemplate } from "@shared/api/hooks/templates/usePatchTemplate";
import MilestoneEditor from "./MilestoneEditor";

type Props = {
  isOpen: boolean;
  onOpenChange: (val: boolean) => void;
  template: Template | null;
  modes: Mode[];
};

function buildNode(template: Template | null): TemplateMilestoneData {
  return {
    title: template?.title ?? "",
    tasks: template?.data?.tasks ?? [],
    subMilestones: template?.data?.subMilestones ?? [],
  };
}

function resolveInitialModeId(
  template: Template | null,
  modes: Mode[]
): number | null {
  if (typeof template?.mode === "number") return template.mode;
  if (modes.length > 0) return modes[0].id;
  return null;
}

export default function EditMilestoneTemplateWindow({
  isOpen,
  onOpenChange,
  template,
  modes,
}: Props) {
  const patchTemplate = usePatchTemplate();

  const [node, setNode] = useState<TemplateMilestoneData>(() =>
    buildNode(template)
  );

  const [modeId, setModeId] = useState<number | null>(() =>
    resolveInitialModeId(template, modes)
  );

  const modeColor = useMemo(() => {
    if (modeId == null) return "#000";
    return modes.find((m) => m.id === modeId)?.color ?? "#000";
  }, [modes, modeId]);

  /** ----------------
   * Body scroll lock
   ----------------- */
  useEffect(() => {
    if (isOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");

    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  /** ----------------
   * Sync when template or modes change
   ----------------- */
  useEffect(() => {
    setNode(buildNode(template));

    const nextModeId = resolveInitialModeId(template, modes);
    if (nextModeId == null) return;

    setModeId((prev) => {
      const hasPrev = prev != null && modes.some((m) => m.id === prev);
      return hasPrev ? prev : nextModeId;
    });
  }, [template, modes]);

  /** ----------------
   * SAVE
   ----------------- */
  const handleSave = () => {
    if (!template) return;
    if (modeId == null) return;

    patchTemplate.mutate({
      id: template.id,
      updates: {
        title: node.title,
        mode: modeId,
        data: node,
      },
    });

    onOpenChange(false);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-lg bg-white rounded-xl shadow-lg p-8 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start gap-3 mb-6">
            <div
              style={{
                borderBottom: "0",
                borderTop: `24px solid ${modeColor}`,
                borderLeft: "16px solid transparent",
                borderRight: "16px solid transparent",
                width: 0,
                height: 0,
              }}
            />
            <input
              type="text"
              value={node.title}
              onChange={(e) => setNode({ ...node, title: e.target.value })}
              placeholder="New Milestone Template Title"
              className="text-2xl font-semibold text-gray-600 w-full focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-6">
            {modeId == null ? (
              <div className="text-sm text-gray-500">Loading modes…</div>
            ) : (
              <>
                <ModeInput
                  modeId={modeId}
                  modes={modes}
                  modeColor={modeColor}
                />

                <MilestoneEditor
                  node={node}
                  onChange={setNode}
                  modeColor={modeColor}
                />

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    className="px-5 py-2 rounded-md text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: modeColor }}
                    disabled={patchTemplate.isPending}
                  >
                    {patchTemplate.isPending ? "Saving…" : "Save Template"}
                  </button>
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
