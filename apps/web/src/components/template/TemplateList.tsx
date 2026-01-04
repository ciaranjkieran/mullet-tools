"use client";

import { Template } from "@shared/types/Template";
import { Mode } from "@shared/types/Mode";
import MilestoneTemplatePreviewCard from "./milestone/MilestoneTemplatePreviewCard";
import ProjectTemplatePreviewCard from "./projects/ProjectTemplatePreviewCard";

type Props = {
  templates: Template[];
  modes: Mode[];
  onEdit: (template: Template) => void;
  onUse?: (template: Template) => void;
};

export default function TemplateList({
  templates,
  modes,
  onEdit,
  onUse,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {templates.map((template) => {
        const mode = modes.find((m) => m.id === template.mode);

        return (
          <div key={template.id} className="h-full">
            {template.type === "milestone" ? (
              <MilestoneTemplatePreviewCard
                template={template}
                mode={mode}
                onEdit={onEdit}
                onUse={onUse}
              />
            ) : (
              <ProjectTemplatePreviewCard
                template={template}
                mode={mode}
                onEdit={onEdit}
                onUse={onUse}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
