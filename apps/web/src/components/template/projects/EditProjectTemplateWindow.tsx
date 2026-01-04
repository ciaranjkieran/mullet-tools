"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import ModeInput from "@/components/timer/inputs/TimerModeSelect";
import { Mode } from "@shared/types/Mode";
import {
  Template,
  TemplateProjectData,
  TemplateMilestoneData,
} from "@shared/types/Template";
import { usePatchTemplate } from "@shared/api/hooks/templates/usePatchTemplate";
import ProjectEditor from "./ProjectEditor";

type Props = {
  isOpen: boolean;
  onOpenChange: (val: boolean) => void;
  template: Template | null;
  modes: Mode[];
};

export default function EditProjectTemplateWindow({
  isOpen,
  onOpenChange,
  template,
  modes,
}: Props) {
  const [node, setNode] = useState<TemplateProjectData>({
    title: template?.title || "",
    tasks:
      template?.data && "tasks" in template.data
        ? (template.data.tasks as string[])
        : [],
    subProjects:
      template?.data && "subProjects" in template.data
        ? (template.data.subProjects as TemplateProjectData[])
        : [],
    subMilestones:
      template?.data && "milestones" in template.data
        ? (template.data.milestones as TemplateMilestoneData[])
        : [],
  });

  const [modeId, setModeId] = useState<number>(template?.mode || modes[0].id);
  const patchTemplate = usePatchTemplate();
  const modeColor = modes.find((m) => m.id === modeId)?.color || "#000";
  const contentRef = useRef<HTMLDivElement>(null);

  /** ----------------
   * Handle body class for modal scroll lock
   ----------------- */
  useEffect(() => {
    if (isOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  /** ----------------
   * Sync when template changes
   ----------------- */
  useEffect(() => {
    if (template) {
      const data = template.data as Partial<TemplateProjectData>;
      setNode({
        title: template.title || "",
        tasks: data.tasks || [],
        subProjects: data.subProjects || [],
        subMilestones: data.subMilestones || [],
      });
      setModeId(template.mode || modes[0].id);
    }
  }, [template]);

  /** ----------------
   * SAVE
   ----------------- */
  const handleSave = () => {
    if (!template) return;
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

  /** ----------------
   * MODAL RENDER
   ----------------- */
  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          ref={contentRef}
          tabIndex={-1}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            contentRef.current?.focus();
          }}
          className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-lg bg-white rounded-xl shadow-lg p-8 max-h-[90vh] overflow-y-auto"
        >
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
              placeholder="New Project Template Title"
              className="text-2xl font-semibold text-gray-600 w-full focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-6">
            <ModeInput
              modeId={modeId}
              setModeId={setModeId}
              modes={modes}
              modeColor={modeColor}
            />

            {/* Recursive Project Editor */}
            <ProjectEditor
              node={node}
              onChange={setNode}
              modeColor={modeColor}
            />

            {/* Footer */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                className="px-5 py-2 rounded-md text-white text-sm font-medium"
                style={{ backgroundColor: modeColor }}
              >
                Save Template
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
