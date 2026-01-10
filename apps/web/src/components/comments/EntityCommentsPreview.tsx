// components/comments/EntityCommentsPreview.tsx
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

type Props = {
  comments: Comment[];
  tasks: Task[];
  milestones: Milestone[];
  projects: Project[];
  goals: Goal[];
  modes: Mode[];
};

type WithId = { id: number };

function indexById<T extends WithId>(arr: T[]): Record<number, T> {
  const out: Record<number, T> = {};
  for (const item of arr) out[item.id] = item;
  return out;
}

function commentEntityType(c: Comment): EntityType | null {
  const m = (c.entity_model ?? "").toLowerCase();
  if (m.includes("task")) return "task";
  if (m.includes("milestone")) return "milestone";
  if (m.includes("project")) return "project";
  if (m.includes("goal")) return "goal";
  return null;
}

function getModeIdFromEntity(
  entity: Task | Milestone | Project | Goal
): number | null {
  // Supports modeId or mode being number|string|null|undefined
  const raw =
    (entity as { modeId?: unknown; mode?: unknown }).modeId ??
    (entity as { mode?: unknown }).mode;

  if (typeof raw === "number" && Number.isFinite(raw)) return raw;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    const n = Number(trimmed);
    if (trimmed !== "" && Number.isFinite(n)) return n;
  }

  return null;
}

export default function EntityCommentsPreview({
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
  const modeMap = useMemo(() => indexById(modes), [modes]);

  const grouped = useMemo(() => {
    const out: Record<string, Comment[]> = {};

    for (const c of comments) {
      // Skip mode-level comments (your convention)
      if (c.content_type === 0) continue;

      const t = commentEntityType(c);
      if (!t) continue;

      const id = c.object_id;
      if (id == null) continue; // ✅ guard null

      const key = `${t}-${id}`;
      (out[key] ??= []).push(c);
    }

    return out;
  }, [comments]);

  return (
    <section className="mt-6 space-y-4">
      {Object.entries(grouped).map(([key, group]) => {
        const first = group[0];
        const type = commentEntityType(first);
        if (!type) return null;

        const id = first.object_id;
        if (id == null) return null; // ✅ guard null so indexing is safe

        let entity: Task | Milestone | Project | Goal | null = null;

        switch (type) {
          case "task":
            entity = taskMap[id] ?? null;
            break;
          case "milestone":
            entity = milestoneMap[id] ?? null;
            break;
          case "project":
            entity = projectMap[id] ?? null;
            break;
          case "goal":
            entity = goalMap[id] ?? null;
            break;
        }

        if (!entity) return null;

        const title = entity.title?.trim() ? entity.title : "[Untitled]";

        const breadcrumb = getEntityBreadcrumb(entity, {
          goalMap,
          projectMap,
          milestoneMap,
        }).trim();

        const modeId = getModeIdFromEntity(entity);
        if (modeId == null) return null;

        const mode = modeMap[modeId];
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
