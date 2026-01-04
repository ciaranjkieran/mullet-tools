"use client";

import { Comment } from "@shared/types/Comment";
import { Task } from "@shared/types/Task";
import { Milestone } from "@shared/types/Milestone";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";
import { Mode } from "@shared/types/Mode";

import { useMemo } from "react";
import CommentPreviewCard from "./CommentPreviewCard";
import { getEntityBreadcrumb } from "../../../../../packages/shared/utils/getEntityBreadcrumb";

type Props = {
  comments: Comment[];
  tasks: Task[];
  milestones: Milestone[];
  projects: Project[];
  goals: Goal[];
  modes: Mode[];
  selectedMode: Mode;
};

export default function ModeEntityCommentsPreview({
  comments,
  tasks,
  milestones,
  projects,
  goals,
  modes,
  selectedMode,
}: Props) {
  const taskMap = useMemo(
    () => Object.fromEntries(tasks.map((t) => [t.id, t])),
    [tasks]
  );
  const milestoneMap = useMemo(
    () => Object.fromEntries(milestones.map((m) => [m.id, m])),
    [milestones]
  );
  const projectMap = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects]
  );
  const goalMap = useMemo(
    () => Object.fromEntries(goals.map((g) => [g.id, g])),
    [goals]
  );
  const modeMap = useMemo(
    () => Object.fromEntries((modes ?? []).map((m) => [m.id, m])),
    [modes]
  );

  const grouped = useMemo(() => {
    const out: Record<string, Comment[]> = {};
    for (const comment of comments) {
      if (comment.content_type === 0) continue; // Skip mode-level
      const key = `${comment.content_type}-${comment.object_id}`;
      if (!out[key]) out[key] = [];
      out[key].push(comment);
    }
    return out;
  }, [comments]);

  return (
    <section className="space-y-4 mt-6">
      {Object.entries(grouped).map(([key, group]) => {
        const { content_type, object_id } = group[0];

        const contentTypeMap: Record<
          number,
          "task" | "milestone" | "project" | "goal"
        > = {
          2: "task",
          12: "milestone",
          10: "project",
          11: "goal",
        };

        const type = contentTypeMap[content_type];
        let entity: Task | Milestone | Project | Goal | null = null;

        switch (type) {
          case "task":
            entity = taskMap[object_id];
            break;
          case "milestone":
            entity = milestoneMap[object_id];
            break;
          case "project":
            entity = projectMap[object_id];
            break;
          case "goal":
            entity = goalMap[object_id];
            break;
          default:
            console.warn(`Unrecognized content_type: ${content_type}`);
            return null;
        }

        if (!entity || !type) return null;

        const title = (entity as any).title || "[Untitled]";
        const breadcrumb = getEntityBreadcrumb(
          entity,
          {
            goalMap,
            projectMap,
            milestoneMap,
          },
          { immediateOnly: true }
        ).trim();

        const mode = modeMap[(entity as any).modeId];
        const modeColor = mode?.color || "#ccc";

        return (
          <CommentPreviewCard
            key={key}
            entity={entity}
            entityType={type}
            comments={group}
            title={title}
            breadcrumb={breadcrumb}
            modeColor={modeColor}
          />
        );
      })}
    </section>
  );
}
