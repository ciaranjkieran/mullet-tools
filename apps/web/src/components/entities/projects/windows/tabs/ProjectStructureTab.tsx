"use client";

import { Project } from "@shared/types/Project";
import { Milestone } from "@shared/types/Milestone";
import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import BatchEditorTrigger from "@/components/batch/BatchEditorTrigger";

import ProjectTreeStateProvider from "@/components/entities/projects/containers/dashboard/ProjectTreeStateProvider";
import ProjectTreeRendererDashboard from "@/components/entities/projects/renderers/dashboard/ProjectTreeRendererDashboard";
import { buildProjectTree } from "@/components/entities/projects/utils/buildProjectTree";

type Props = {
  project: Project;
  mode: Mode | undefined; // make this explicit
  milestones: Milestone[];
  projects: Project[];
  tasks: Task[];
};

export default function ProjectStructureTab({
  project,
  tasks,
  mode,
  milestones,
  projects,
}: Props) {
  // Guard against undefined modeId or undefined mode
  if (!project.modeId || !mode) return null;

  const tree = buildProjectTree(projects, project.id);

  return (
    <div
      className="flex-1 flex flex-col overflow-y-auto scrollbar-thin mb-6"
      style={{
        ["--scrollbar-color" as any]: mode.color,
      }}
    >
      <div className="flex-1 flex flex-col relative overflow-hidden rounded-lg">
        <div className="flex-1 flex flex-col overflow-y-auto scrollbar-thin pt-4 pl-4">
          <div className="px-4 space-y-6 pt-4">
            <ProjectTreeStateProvider projects={tree}>
              {() => (
                <ProjectTreeRendererDashboard
                  project={{
                    ...project,
                    children: tree,
                  }}
                  depth={0}
                  tasks={tasks}
                  mode={mode}
                  modes={[mode].filter(Boolean)}
                  milestones={milestones}
                  dialogOpen={false}
                  variant="title"
                />
              )}
            </ProjectTreeStateProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
