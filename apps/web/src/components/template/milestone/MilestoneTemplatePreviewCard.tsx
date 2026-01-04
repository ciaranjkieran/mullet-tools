"use client";

import { useState } from "react";
import { Template, TemplateMilestoneData } from "@shared/types/Template";
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

export default function MilestoneTemplatePreviewCard({
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
    else window.location.href = `/milestones/new?templateId=${template.id}`;
  };

  const handleEdit = () => onEdit(template);

  const countEntities = (m: TemplateMilestoneData): number => {
    const tasks = m.tasks || [];
    const subs = m.subMilestones || [];
    let total = tasks.length;
    for (const sm of subs) total += 1 + countEntities(sm);
    return total;
  };

  const renderLimited = (
    milestone: TemplateMilestoneData,
    depth: number,
    remaining: number,
    acc: React.ReactNode[]
  ): { remaining: number; hidden: number } => {
    const isRoot = depth === 0;
    const tasks = milestone.tasks || [];
    const subs = milestone.subMilestones || [];
    let rem = remaining;
    let hidden = 0;

    if (!isRoot) {
      if (rem > 0) {
        acc.push(
          <div
            key={`ms-${depth}-${milestone.title}-${rem}`}
            className={`flex items-center gap-2 ${depth > 0 ? "ml-4" : ""}`}
          >
            <span
              className="triangle"
              style={{
                borderTopColor: modeColor,
                borderTopWidth: 10,
                borderLeftWidth: 6,
                borderRightWidth: 6,
                transform: "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
            <span className="font-medium text-sm">{milestone.title}</span>
          </div>
        );
        rem -= 1;
      } else {
        hidden += 1 + countEntities(milestone);
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

    if (subs.length) {
      for (let i = 0; i < subs.length; i++) {
        const sm = subs[i];
        if (rem > 0) {
          const res = renderLimited(sm, depth + 1, rem, acc);
          rem = res.remaining;
          hidden += res.hidden;
        } else {
          hidden += 1 + countEntities(sm);
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
      template.data as TemplateMilestoneData,
      0,
      MAX,
      nodes
    );
    hiddenCount = res.hidden;
  }

  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-4 w-full h-full hover:shadow-md transition">
      <div className="flex items-start gap-3">
        <div
          style={{
            borderBottom: "0",
            borderTop: `20px solid ${modeColor}`,
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            width: 0,
            height: 0,
          }}
        />
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
