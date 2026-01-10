// components/views/templates/AllModeTemplatesView.tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { Mode } from "@shared/types/Mode";
import type { Template } from "@shared/types/Template";
import TemplateList from "./TemplateList";

type Props = {
  mode: Mode;
  milestoneTemplates: Template[];
  projectTemplates: Template[];
  modes: Mode[];
  onEdit: (template: Template) => void;
  onUse?: (template: Template) => void;
};

export default function AllModeTemplatesSection({
  mode,
  milestoneTemplates,
  projectTemplates,
  modes,
  onEdit,
  onUse,
}: Props) {
  const [showMilestones, setShowMilestones] = useState(true);
  const [showProjects, setShowProjects] = useState(true);

  const hasMilestones = milestoneTemplates.length > 0;
  const hasProjects = projectTemplates.length > 0;

  // If this mode has no templates at all, don't render the row
  if (!hasMilestones && !hasProjects) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-md border border-gray-200 p-4">
      {/* Mode header */}
      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-5 rounded-sm"
          style={{ backgroundColor: mode.color }}
        />
        <h2 className="text-lg font-semibold text-gray-800">{mode.title}</h2>
      </div>

      {/* Row: left column = milestone, right column = project */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT COLUMN – Milestones */}
        <div className="space-y-2">
          {hasMilestones && (
            <>
              <button
                type="button"
                className="flex items-center gap-2 text-md font-semibold text-gray-800 hover:underline"
                onClick={() => setShowMilestones((prev) => !prev)}
              >
                {showMilestones ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span>Milestones</span>
                <span className="text-xs text-gray-500 font-normal">
                  ({milestoneTemplates.length})
                </span>
              </button>

              {showMilestones && (
                <TemplateList
                  templates={milestoneTemplates}
                  modes={modes}
                  onEdit={onEdit}
                  onUse={onUse}
                />
              )}
            </>
          )}
        </div>

        {/* RIGHT COLUMN – Projects */}
        <div className="space-y-2">
          {hasProjects && (
            <>
              <button
                type="button"
                className="flex items-center gap-2 text-md font-semibold text-gray-800 hover:underline"
                onClick={() => setShowProjects((prev) => !prev)}
              >
                {showProjects ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span>Projects</span>
                <span className="text-xs text-gray-500 font-normal">
                  ({projectTemplates.length})
                </span>
              </button>

              {showProjects && (
                <TemplateList
                  templates={projectTemplates}
                  modes={modes}
                  onEdit={onEdit}
                  onUse={onUse}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
