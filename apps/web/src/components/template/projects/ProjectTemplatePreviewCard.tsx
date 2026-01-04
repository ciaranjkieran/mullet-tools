"use client";

import { useState } from "react";
import { Template, TemplateProjectData } from "@shared/types/Template";
import { Mode } from "@shared/types/Mode";
import { useDeleteTemplate } from "@shared/api/hooks/templates/useDeleteTemplate";
import { Trash2, Pencil, Play } from "lucide-react";
import ConfirmDialog from "@/lib/utils/ConfirmDialog";
import { getContrastingText } from "@shared/utils/getContrastingText";

type Props = {
  template: Template;
  mode?: Mode;
  onEdit: (template: Template) => void;
  onUse?: (template: Template) => void;
};

export default function ProjectTemplatePreviewCard({
  template,
  mode,
  onEdit,
  onUse,
}: Props) {
  const deleteTemplate = useDeleteTemplate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const modeColor = mode?.color || "#ccc";

  const handleDeleteRequest = () => setConfirmOpen(true);
  const handleConfirmDelete = () => deleteTemplate.mutate(template.id);

  const handleUse = () => {
    if (onUse && mode?.id) onUse(template);
    else window.location.href = `/projects/new?templateId=${template.id}`;
  };

  const handleEdit = () => onEdit(template);

  const countEntities = (project: TemplateProjectData): number => {
    const tasks = project.tasks || [];
    const milestones = project.subMilestones || [];
    const subs = project.subProjects || [];
    let total = tasks.length + milestones.length;
    for (const sp of subs) total += 1 + countEntities(sp);
    return total;
  };

  const renderLimited = (
    project: TemplateProjectData,
    depth: number,
    remaining: number,
    acc: React.ReactNode[]
  ): { remaining: number; hidden: number } => {
    const isRoot = depth === 0;
    const tasks = project.tasks || [];
    const milestones = project.subMilestones || [];
    const subs = project.subProjects || [];
    let rem = remaining;
    let hidden = 0;

    if (!isRoot) {
      if (rem > 0) {
        acc.push(
          <div
            key={`p-${project.title}-${depth}-${rem}`}
            className={`flex items-center gap-2 ${depth > 0 ? "ml-4" : ""}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={modeColor}
              className="w-6 h-6"
            >
              <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h5.379a1.5 1.5 0 0 1 1.06.44l1.621 1.62H19.5A1.5 1.5 0 0 1 21 6.56V18a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18V4.5Z" />
            </svg>
            <span className="font-medium text-sm">{project.title}</span>
          </div>
        );
        rem -= 1;
      } else {
        hidden += 1 + countEntities(project);
        return { remaining: rem, hidden };
      }
    }

    if (tasks.length) {
      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        if (rem > 0) {
          acc.push(
            <div
              key={`t-${depth}-${i}-${t}`}
              className="flex items-start gap-2 text-sm px-3 py-1 border border-gray-200 rounded-md bg-gray-50 text-gray-700 ml-6"
            >
              <span
                className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                style={{ backgroundColor: modeColor }}
              />
              <span>{t}</span>
            </div>
          );
          rem -= 1;
        } else {
          hidden += tasks.length - i;
          break;
        }
      }
    }

    if (rem > 0 && milestones.length) {
      for (let i = 0; i < milestones.length; i++) {
        const m = milestones[i];
        if (rem > 0) {
          acc.push(
            <div
              key={`m-${depth}-${m.title}-${i}`}
              className="flex items-center gap-2 text-sm text-gray-700 ml-6"
            >
              <span
                className="triangle"
                style={{
                  borderTopColor: modeColor,
                  borderTopWidth: 8,
                  borderLeftWidth: 5,
                  borderRightWidth: 5,
                }}
              />
              {m.title}
            </div>
          );
          rem -= 1;
        } else {
          hidden += milestones.length - i;
          break;
        }
      }
    } else if (rem === 0 && milestones.length) {
      hidden += milestones.length;
    }

    if (subs.length) {
      for (let i = 0; i < subs.length; i++) {
        const sp = subs[i];
        if (rem > 0) {
          const res = renderLimited(sp, depth + 1, rem, acc);
          rem = res.remaining;
          hidden += res.hidden;
        } else {
          hidden += 1 + countEntities(sp);
        }
      }
    }

    return { remaining: rem, hidden };
  };

  const MAX = 5;
  const nodes: React.ReactNode[] = [];
  let hiddenCount = 0;
  if (template.data) {
    const res = renderLimited(
      template.data as TemplateProjectData,
      0,
      MAX,
      nodes
    );
    hiddenCount = res.hidden;
  }

  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-4 w-full h-full hover:shadow-md transition">
      <div className="flex items-start gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={modeColor}
          className="w-6 h-6"
        >
          <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h5.379a1.5 1.5 0 0 1 1.06.44l1.621 1.62H19.5A1.5 1.5 0 0 1 21 6.56V18a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18V4.5Z" />
        </svg>
        <div className="flex flex-col">
          <h3 className="text-base font-semibold break-words leading-tight">
            {template.title}
          </h3>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {nodes}
        {hiddenCount > 0 && (
          <div className="text-xs text-gray-400 italic ml-1">
            + {hiddenCount} more
          </div>
        )}
      </div>

      <div
        className="mt-auto flex justify-end gap-2"
        style={{
          ["--mc" as any]: modeColor,
          ["--ct" as any]: getContrastingText(modeColor),
        }}
      >
        <button
          onClick={handleUse}
          className="text-sm font-semibold px-3 py-1 border rounded transition flex items-center gap-1
               border-[color:var(--mc)] text-[color:var(--mc)]
               hover:bg-[color:var(--mc)]/80 hover:text-[color:var(--ct)]"
        >
          <Play className="w-4 h-4" />
          Use
        </button>

        <button
          onClick={handleEdit}
          className="text-sm font-semibold px-3 py-1 border rounded transition flex items-center gap-1
               border-[color:var(--mc)] text-[color:var(--mc)]
               hover:bg-[color:var(--mc)]/80 hover:text-[color:var(--ct)]"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </button>

        <button
          onClick={handleDeleteRequest}
          className="text-sm font-semibold px-3 py-1 border border-red-500 text-red-600 rounded transition flex items-center gap-1
               hover:bg-red-100 disabled:opacity-60"
          disabled={deleteTemplate.isPending}
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete this template?"
        description={
          <div className="space-y-2">
            <p>
              This action cannot be undone. The template will be permanently
              deleted.
            </p>
            <p className="text-xs text-gray-700">
              <span className="font-medium">Template:</span> {template.title}
            </p>
          </div>
        }
        confirmText={deleteTemplate.isPending ? "Deleting…" : "Delete"}
        cancelText="Cancel"
      />
    </div>
  );
}
