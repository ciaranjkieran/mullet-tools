// components/views/templates/AllModeTemplatesSection.tsx
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
  // If this mode has no templates at all, don't render the row
  if (milestoneTemplates.length === 0 && projectTemplates.length === 0) {
    return null;
  }

  const [showMilestones, setShowMilestones] = useState(true);
  const [showProjects, setShowProjects] = useState(true);

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
        {/* LEFT COLUMN – always rendered, may be empty */}
        <div className="space-y-2">
          {milestoneTemplates.length > 0 && (
            <>
              <button
                type="button"
                className="flex items-center gap-2 text-md font-semibold text-gray-800 hover:underline"
                onClick={() => setShowMilestones((prev) => !prev)}
              ></button>

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

        {/* RIGHT COLUMN – always rendered, may be empty */}
        <div className="space-y-2">
          {projectTemplates.length > 0 && (
            <>
              <button
                type="button"
                className="flex items-center gap-2 text-md font-semibold text-gray-800 hover:underline"
                onClick={() => setShowProjects((prev) => !prev)}
              ></button>

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
