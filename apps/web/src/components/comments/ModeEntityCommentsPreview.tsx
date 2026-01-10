"use client";

import { useMemo } from "react";

import type { Comment } from "@shared/types/Comment";
import type { Task } from "@shared/types/Task";
import type { Milestone } from "@shared/types/Milestone";
import type { Project } from "@shared/types/Project";
import type { Goal } from "@shared/types/Goal";
import type { Mode } from "@shared/types/Mode";

import CommentPreviewCard from "./CommentPreviewCard";
import { getEntityBreadcrumb } from "../../../../../packages/shared/utils/getEntityBreadcrumb";

type EntityType = "task" | "milestone" | "project" | "goal";
type Entity = Task | Milestone | Project | Goal;

type Props = {
  comments: Comment[];
  tasks: Task[];
  milestones: Milestone[];
  projects: Project[];
  goals: Goal[];
  modes: Mode[];
};

function indexById<T extends { id: number }>(arr: T[]): Record<number, T> {
  const out: Record<number, T> = {};
  for (const item of arr) out[item.id] = item;
  return out;
}

function getTitle(entity: Entity): string {
  // All your entities have title in the types you shared
  const t = entity.title;
  return typeof t === "string" && t.trim() ? t : "[Untitled]";
}

function getModeId(entity: Entity): number | null {
  // Your entities use modeId: number (based on your shared types)
  const mid = entity.modeId;
  return typeof mid === "number" && Number.isFinite(mid) ? mid : null;
}

export default function ModeEntityCommentsPreview({
  comments,
  tasks,
  milestones,
  projects,
  goals,
  modes,
}: Props) {
  const taskMap = useMemo(() => indexById(tasks), [tasks]);
  const milestoneMap = useMemo(() => indexById(milestones), [milestones]);
  const projectMap = useMemo(() => indexById(projects), [projects]);
  const goalMap = useMemo(() => indexById(goals), [goals]);
  const modeMap = useMemo(() => indexById(modes ?? []), [modes]);

  // If your backend uses numeric ContentType IDs, keep them here:
  const contentTypeMap: Record<number, EntityType> = {
    2: "task",
    12: "milestone",
    10: "project",
    11: "goal",
  };

  const grouped = useMemo(() => {
    const out: Record<string, Comment[]> = {};

    for (const c of comments) {
      // mode-level comments
      if (c.content_type === 0) continue;

      const ct = c.content_type;
      const oid = c.object_id;

      // your Comment type allows nulls
      if (ct == null || oid == null) continue;

      const type = contentTypeMap[ct];
      if (!type) continue;

      const key = `${type}-${oid}`;
      (out[key] ??= []).push(c);
    }

    return out;
  }, [comments]);

  return (
    <section className="space-y-4 mt-6">
      {Object.entries(grouped).map(([key, group]) => {
        const first = group[0];
        if (!first) return null;

        const ct = first.content_type;
        const oid = first.object_id;

        if (ct == null || oid == null) return null;

        const type = contentTypeMap[ct];
        if (!type) {
          console.warn(`Unrecognized content_type: ${ct}`);
          return null;
        }

        let entity: Entity | null = null;

        switch (type) {
          case "task":
            entity = taskMap[oid] ?? null;
            break;
          case "milestone":
            entity = milestoneMap[oid] ?? null;
            break;
          case "project":
            entity = projectMap[oid] ?? null;
            break;
          case "goal":
            entity = goalMap[oid] ?? null;
            break;
        }

        if (!entity) return null;

        const title = getTitle(entity);

        const breadcrumb = getEntityBreadcrumb(
          entity,
          { goalMap, projectMap, milestoneMap },
          { immediateOnly: true }
        ).trim();

        const modeId = getModeId(entity);
        const modeColor =
          modeId != null ? modeMap[modeId]?.color || "#ccc" : "#ccc";

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
