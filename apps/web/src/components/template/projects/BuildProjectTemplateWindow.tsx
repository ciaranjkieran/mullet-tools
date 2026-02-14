// components/template/projects/BuildProjectTemplateWindow.tsx
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { Mode } from "@shared/types/Mode";
import { TemplateProjectData } from "@shared/types/Template";
import ProjectEditor from "./ProjectEditor";
import { useCreateTemplate } from "@shared/api/hooks/templates/useCreateTemplate";
import EditorModeSelect from "../../inputs/editor/EditorModeSelect";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modes: Mode[];
  modeColor: string;
  /** Prefill support */
  prefillNode?: TemplateProjectData;
  prefillModeId?: number | null;
  /** Optional callback once the modal fully closes */
  onAfterClose?: () => void;
}

const EMPTY_PROJECT: TemplateProjectData = {
  title: "",
  description: "",
  tasks: [],
  subProjects: [],
  subMilestones: [],
};

export default function BuildProjectTemplateWindow({
  open,
  onOpenChange,
  modes,
  modeColor,
  prefillNode,
  prefillModeId,
  onAfterClose,
}: Props) {
  const [project, setProject] = useState<TemplateProjectData>(EMPTY_PROJECT);
  const [modeId, setModeId] = useState<number | null>(null);

  const createTemplate = useCreateTemplate();

  // Body class for modal
  useEffect(() => {
    if (open) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  // Hydrate from prefill when opened (and from selectedMode via prefillModeId)
  useEffect(() => {
    if (!open) return;

    setProject(prefillNode ?? EMPTY_PROJECT);

    if (prefillModeId != null) {
      setModeId(prefillModeId);
    } else if (modes.length) {
      setModeId(modes[0].id);
    }
  }, [open, prefillNode, prefillModeId, modes]);

  const internalClose = (o: boolean) => {
    if (!o) {
      // Reset local state so next open re-syncs with selectedMode (via prefillModeId)
      setModeId(null);
      setProject(EMPTY_PROJECT);
      onAfterClose?.();
    }

    onOpenChange(o);
  };

  const effectiveMode =
    modes.find((m) => m.id === modeId) ??
    (prefillModeId != null
      ? modes.find((m) => m.id === prefillModeId)
      : modes[0]);

  const effectiveModeColor = effectiveMode?.color ?? modeColor;
  const effectiveModeId =
    modeId ?? prefillModeId ?? (modes.length ? modes[0].id : 0);

  const handleSaveTemplate = () => {
    const modeToUse =
      modeId ?? prefillModeId ?? (modes.length ? modes[0].id : null);

    if (!modeToUse) return;

    createTemplate.mutate({
      title: project.title || "Untitled Project Template",
      type: "project",
      mode: modeToUse,
      data: project,
    });
    internalClose(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={internalClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-3xl bg-white rounded-xl shadow-lg max-h-[90vh] overflow-y-auto">
          <div className="p-8 space-y-8">
            {/* Project Template Title */}
            <div className="flex items-center gap-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={effectiveModeColor}
                className="w-6 h-6"
              >
                <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h5.379a1.5 1.5 0 0 1 1.06.44l1.621 1.62H19.5A1.5 1.5 0 0 1 21 6.56V18a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18V4.5Z" />
              </svg>
              <input
                type="text"
                value={project.title}
                onChange={(e) =>
                  setProject({ ...project, title: e.target.value })
                }
                placeholder="Project title"
                className="w-full text-2xl font-bold tracking-tight placeholder-gray-400 focus:outline-none border-none bg-transparent"
              />
            </div>

            {/* Mode Selector – drives local colour only */}
            {modes.length > 0 && (
              <EditorModeSelect
                modes={modes}
                modeId={effectiveModeId}
                modeColor={effectiveModeColor}
                onChange={(id) => setModeId(id)}
              />
            )}

            {/* Recursive Project Editor */}
            <ProjectEditor
              node={project}
              onChange={setProject}
              modeColor={effectiveModeColor}
              depth={0}
            />

            {/* Footer */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => internalClose(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 rounded text-white"
                style={{ backgroundColor: effectiveModeColor }}
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
