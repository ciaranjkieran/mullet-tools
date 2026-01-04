// MilestoneTemplateUseWindow.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Template, TemplateMilestoneData } from "@shared/types/Template";
import { Mode } from "@shared/types/Mode";
import { Milestone } from "@shared/types/Milestone";
import useApplyTemplate from "@shared/api/hooks/templates/useApplyTemplate";
import MilestoneEditor from "./MilestoneEditor";
import { useHomeFocusStore } from "@/lib/store/useNavFocusStore";

export default function MilestoneTemplateUseWindow({
  isOpen,
  onOpenChange,
  template,
  modes,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
  modes: Mode[];
}) {
  const { applyTemplate } = useApplyTemplate();
  const actionTriggered = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const [milestone, setMilestone] = useState<TemplateMilestoneData>({
    title: "",
    tasks: [],
    subMilestones: [],
  });

  const modeColor = useMemo(
    () =>
      template
        ? modes.find((m) => m.id === template.mode)?.color || "#000"
        : "#000",
    [template, modes]
  );

  useEffect(() => {
    if (isOpen && template) {
      const data = template.data as any;
      setMilestone({
        title: template.title,
        tasks: data?.tasks || [],
        subMilestones: data?.subMilestones || [],
      });
      actionTriggered.current = false;
      setSubmitting(false);
    }
  }, [isOpen, template]);

  useEffect(() => {
    if (isOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  if (!template) return null;

  const handleUseTemplate = async () => {
    if (actionTriggered.current || submitting) return;
    actionTriggered.current = true;
    setSubmitting(true);

    try {
      if (template.type !== "milestone") return;

      const customTemplate: Template = {
        ...template,
        title: milestone.title,
        data: milestone,
      };

      const created = (await applyTemplate(customTemplate)) as Milestone;
      if (!created?.id) return;

      const store = useHomeFocusStore.getState() as any;
      store.setActiveModeId?.(created.modeId);
      store.setTarget({
        kind: "milestone",
        id: created.id,
        modeId: created.modeId,
      });

      onOpenChange(false);
      document.body.classList.remove("modal-open");
    } catch (err) {
      actionTriggered.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          ref={contentRef}
          tabIndex={-1}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            requestAnimationFrame(() => contentRef.current?.focus());
          }}
          aria-describedby="milestone-template-desc"
          className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-2xl bg-white rounded-xl shadow-lg max-h-[90vh] overflow-y-auto"
        >
          <Dialog.Title className="sr-only">
            Use Milestone Template
          </Dialog.Title>
          <div className="p-8 space-y-8">
            <div className="flex items-center gap-4">
              <span
                className="inline-block"
                style={{
                  borderBottom: "0",
                  borderTop: `28px solid ${modeColor}`,
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

            <MilestoneEditor
              node={milestone}
              onChange={setMilestone}
              modeColor={modeColor}
              depth={0}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 border rounded"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleUseTemplate}
                className="px-4 py-2 rounded text-white font-semibold disabled:opacity-60"
                style={{ backgroundColor: modeColor }}
                disabled={submitting || !milestone.title.trim()}
              >
                {submitting ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
