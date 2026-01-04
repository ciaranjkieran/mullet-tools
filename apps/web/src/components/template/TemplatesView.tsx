// components/views/templates/TemplatesView.tsx
"use client";

import { useState, useMemo } from "react";
import { useTemplates } from "@shared/api/hooks/templates/useTemplates";
import type { Mode } from "@shared/types/Mode";
import type { Template } from "@shared/types/Template";

import EditProjectTemplateWindow from "./projects/EditProjectTemplateWindow";
import EditMilestoneTemplateWindow from "./milestone/EditMilestoneTemplateWindow";
import MilestoneTemplateUseWindow from "./milestone/MilestoneTemplateUseWindow";
import ProjectTemplateUseWindow from "./projects/ProjectTemplateUseWindow";

import CreateMilestoneButton from "./milestone/CreateMilestoneTemplateButton";
import CreateProjectButton from "./projects/CreateProjectTemplateButton";
import TemplateList from "./TemplateList";
import BuildMilestoneTemplateWindow from "./milestone/BuildMilestoneTemplateWindow";
import BuildProjectTemplateWindow from "./projects/BuildProjectTemplateWindow";

import TemplateWorkbenchPortal from "./TemplateWorkbenchPortal";
import AllModeTemplatesSection from "./AllModeTemplatesView";

type Props = {
  modes: Mode[];
  selectedMode: Mode | "All";
};

export default function TemplatesView({ modes, selectedMode }: Props) {
  const { data: templates = [], isLoading } = useTemplates();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<"milestone" | "project">(
    "milestone"
  );
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [usingTemplate, setUsingTemplate] = useState<Template | null>(null);

  const showAllMode = selectedMode === "All";

  const modeColorFor = (id: number) =>
    modes.find((m) => m.id === id)?.color || "#555";

  const modeColor = useMemo(() => {
    if (selectedMode === "All") return "#000";
    return modeColorFor(selectedMode.id);
  }, [selectedMode, modes]);

  // For single-mode view
  const filtered = useMemo(
    () => ({
      milestone: templates.filter(
        (t: Template) =>
          t.type === "milestone" &&
          (selectedMode === "All" || t.mode === selectedMode.id)
      ),
      project: templates.filter(
        (t: Template) =>
          t.type === "project" &&
          (selectedMode === "All" || t.mode === selectedMode.id)
      ),
    }),
    [templates, selectedMode]
  );

  const handleEdit = (template: Template) => setEditingTemplate(template);
  const handleUse = (template: Template) => setUsingTemplate(template);

  return (
    <div className="p-6 h-full flex flex-col">
      {/* No create buttons in All mode */}
      {!showAllMode && (
        <div className="mb-4 grid grid-cols-2 gap-6">
          <CreateMilestoneButton
            onClick={() => {
              setSelectedType("milestone");
              setIsCreateOpen(true);
            }}
            modeColor={modeColor}
          />
          <CreateProjectButton
            onClick={() => {
              setSelectedType("project");
              setIsCreateOpen(true);
            }}
            modeColor={modeColor}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p>Loading templates...</p>
        ) : showAllMode ? (
          // 🔹 ALL MODE: modes stacked by row, each row has milestone / project columns
          <div className="space-y-4">
            {modes.map((mode) => {
              const milestoneTemplatesForMode = templates.filter(
                (t: Template) => t.type === "milestone" && t.mode === mode.id
              );
              const projectTemplatesForMode = templates.filter(
                (t: Template) => t.type === "project" && t.mode === mode.id
              );

              return (
                <AllModeTemplatesSection
                  key={mode.id}
                  mode={mode}
                  milestoneTemplates={milestoneTemplatesForMode}
                  projectTemplates={projectTemplatesForMode}
                  modes={modes}
                  onEdit={handleEdit}
                  onUse={handleUse}
                />
              );
            })}
          </div>
        ) : (
          // 🔹 SINGLE MODE: original 2-column layout
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* Left: Milestones */}
            <div className="flex flex-col h-full">
              <div className="overflow-y-auto flex-1 mt-4">
                {filtered.milestone.length === 0 ? (
                  <p className="text-muted mt-2">
                    No milestone templates found.
                  </p>
                ) : (
                  <TemplateList
                    templates={filtered.milestone}
                    modes={modes}
                    onEdit={handleEdit}
                    onUse={handleUse}
                  />
                )}
              </div>
            </div>

            {/* Right: Projects */}
            <div className="flex flex-col h-full">
              <div className="overflow-y-auto flex-1 mt-4">
                {filtered.project.length === 0 ? (
                  <p className="text-muted mt-2"></p>
                ) : (
                  <TemplateList
                    templates={filtered.project}
                    modes={modes}
                    onEdit={handleEdit}
                    onUse={handleUse}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Use Template Modals */}
      {usingTemplate?.type === "milestone" && (
        <MilestoneTemplateUseWindow
          isOpen={!!usingTemplate}
          onOpenChange={(open) => !open && setUsingTemplate(null)}
          template={usingTemplate}
          modes={modes}
        />
      )}

      {usingTemplate?.type === "project" && (
        <ProjectTemplateUseWindow
          isOpen={!!usingTemplate}
          onOpenChange={(open) => !open && setUsingTemplate(null)}
          template={usingTemplate}
          modes={modes}
        />
      )}

      {/* Build New Template Modals */}
      <BuildMilestoneTemplateWindow
        open={isCreateOpen && selectedType === "milestone"}
        onOpenChange={setIsCreateOpen}
        modes={modes}
        modeColor={modeColor}
        prefillModeId={selectedMode === "All" ? null : selectedMode.id} // ✅ add this
      />

      <BuildProjectTemplateWindow
        open={isCreateOpen && selectedType === "project"}
        onOpenChange={setIsCreateOpen}
        modes={modes}
        modeColor={modeColor}
        prefillModeId={selectedMode === "All" ? null : selectedMode.id} // ✅ add this too (if supported)
      />

      {/* Edit Template Modals */}
      <EditMilestoneTemplateWindow
        isOpen={!!editingTemplate && editingTemplate.type === "milestone"}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        template={
          editingTemplate?.type === "milestone" ? editingTemplate : null
        }
        modes={modes}
      />
      <EditProjectTemplateWindow
        isOpen={!!editingTemplate && editingTemplate.type === "project"}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        template={editingTemplate?.type === "project" ? editingTemplate : null}
        modes={modes}
      />

      <TemplateWorkbenchPortal modes={modes} modeColorFor={modeColorFor} />
    </div>
  );
}
