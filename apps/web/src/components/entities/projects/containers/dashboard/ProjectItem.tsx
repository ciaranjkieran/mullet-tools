// components/entities/projects/containers/dashboard/ProjectItem.tsx
"use client";

import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import { Milestone } from "@shared/types/Milestone";
import { NestedProject } from "../../utils/buildProjectTree";
import ProjectRenderer from "../../renderers/dashboard/ProjectRendererDashboard";
import { useEntityUIStore } from "@/lib/store/useEntityUIStore";
import ProjectList from "./ProjectList";
import TaskSectionDashboard from "@/components/entities/tasks/containers/dashboard/TaskSectionDashboard";
import MilestoneList, {
  type Container as MilestoneContainer,
} from "@/components/entities/milestones/containers/dashboard/MilestoneList";
import {
  makeMilestoneMaps,
  milestoneEffectiveParentId,
  milestoneEffectiveProjectId,
} from "@shared/lineage/effective";

type Props = {
  project: NestedProject | undefined;
  parentId: number | null;
  depth: number;
  mode: Mode;
  modes: Mode[];
  tasks: Task[];
  milestones?: Milestone[];
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
};

// Minimal nested milestone shape for the list (must have children array)
type NestedMilestone = Milestone & { children: NestedMilestone[] };

type ProjectWithChildren = NestedProject & { children?: NestedProject[] };
function hasProjectChildren(p: NestedProject): p is ProjectWithChildren {
  return (
    typeof p === "object" &&
    p !== null &&
    "children" in p &&
    Array.isArray((p as Record<string, unknown>).children)
  );
}

export default function ProjectItem({
  project,
  parentId,
  depth,
  mode,
  modes,
  tasks,
  milestones = [],
  dragHandleProps,
}: Props) {
  // keep for compatibility / potential future use
  void parentId;

  // Safe primitive id (before any selectors)
  const pid = typeof project?.id === "number" ? project.id : undefined;

  // Selector uses only pid
  const collapsed = useEntityUIStore((s) => s.isCollapsed("project", pid));

  // Bail if we still don't have a valid project
  if (!pid || !project) return null;

  const modeColor = modes.find((m) => m.id === project.modeId)?.color ?? "#000";

  // Tasks directly under THIS project (no milestone)
  const childTasks = tasks
    .filter(
      (t) =>
        t.modeId === mode.id && t.projectId === pid && t.milestoneId == null,
    )
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  // ─────────────────────────────────────────────────────────────
  // Build a nested milestone tree for THIS project using "effective" lineage
  // Only include milestones whose *effective* projectId is this pid.
  const msMaps = makeMilestoneMaps(milestones);
  const msById = msMaps.byId;

  // Group children by *effective* parent milestone id (within this project)
  const childrenByParent = new Map<number | null, NestedMilestone[]>();

  for (const m of milestones) {
    const effProjId = milestoneEffectiveProjectId(m.id, msById);
    if (effProjId !== pid) continue; // not in this project (effectively)

    const effParentId = milestoneEffectiveParentId(m.id, msById);
    const key: number | null = effParentId ?? null;

    const bucket = childrenByParent.get(key);
    const node: NestedMilestone = { ...m, children: [] };

    if (bucket) bucket.push(node);
    else childrenByParent.set(key, [node]);
  }

  // Depth-first attach children arrays
  const attachChildren = (node: NestedMilestone): NestedMilestone => {
    const kids = childrenByParent.get(node.id) ?? [];
    node.children = kids.map(attachChildren);
    return node;
  };

  // Project-root milestones are those with no effective parent (key === null)
  const projectMilestoneTree: NestedMilestone[] = (
    childrenByParent.get(null) ?? []
  ).map(attachChildren);
  // ─────────────────────────────────────────────────────────────

  // Defensive for recursion of projects (no any)
  const children: NestedProject[] = hasProjectChildren(project)
    ? (project.children ?? [])
    : [];

  return (
    <div
      className="space-y-2"
      style={{
        marginLeft: `calc(${depth} * var(--tree-indent-multiplier, 16) * 1px)`,
      }}
    >
      {" "}
      <ProjectRenderer
        project={project}
        dragHandleProps={dragHandleProps}
        modeColor={modeColor}
      />
      {!collapsed && (
        <div className="mt-2 space-y-4">
          <TaskSectionDashboard
            tasks={childTasks}
            mode={mode}
            modes={modes}
            projectId={pid}
          />

          {/* Milestones under THIS project (tree) */}
          {projectMilestoneTree.length > 0 && (
            <MilestoneList
              parentId={null}
              milestones={projectMilestoneTree}
              depth={depth + 1}
              mode={mode}
              modes={modes}
              tasks={tasks}
              container={{ kind: "project", id: pid } as MilestoneContainer}
            />
          )}

          {/* Sub-projects (recursion) */}
          {children.length > 0 && (
            <ProjectList
              parentId={pid}
              projects={children}
              depth={depth + 1}
              mode={mode}
              modes={modes}
              tasks={tasks}
              milestones={milestones}
              container={{ kind: "project", id: pid }}
            />
          )}
        </div>
      )}
    </div>
  );
}
