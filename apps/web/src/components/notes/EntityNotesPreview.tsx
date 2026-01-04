"use client";

import { useMemo } from "react";
import { Note } from "@shared/types/Note";
import { Task } from "@shared/types/Task";
import { Milestone } from "@shared/types/Milestone";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";
import { Mode } from "@shared/types/Mode";

import NoteCard from "./NoteCard";
import { getEntityBreadcrumb } from "@shared/utils/getEntityBreadcrumb";

type Props = {
  notes: Note[];
  tasks: Task[];
  milestones: Milestone[];
  projects?: Project[];
  goals?: Goal[];
  modes: Mode[];
  selectedMode: Mode | null;
};

export default function EntityNotesPreview({
  notes,
  tasks,
  milestones,
  projects,
  goals,
  modes,
  selectedMode,
}: Props) {
  const taskMap = useMemo(
    () => Object.fromEntries(tasks.map((t) => [String(t.id), t])),
    [tasks]
  );

  const milestoneMap = useMemo(
    () => Object.fromEntries(milestones.map((m) => [String(m.id), m])),
    [milestones]
  );

  const projectMap = useMemo(() => {
    return projects?.length
      ? Object.fromEntries(projects.map((p) => [String(p.id), p]))
      : {};
  }, [projects]);

  const goalMap = useMemo(() => {
    return goals?.length
      ? Object.fromEntries(goals.map((g) => [String(g.id), g]))
      : {};
  }, [goals]);

  const modeMap = useMemo(
    () => Object.fromEntries(modes.map((m) => [m.id, m])),
    [modes]
  );

  const grouped = useMemo(() => {
    const out: Record<string, Note[]> = {};
    for (const note of notes) {
      const key = `${note.content_type}-${note.object_id}`;
      if (!out[key]) out[key] = [];
      out[key].push(note);
    }
    return out;
  }, [notes]);

  return (
    <section className="space-y-4 mt-6">
      {Object.entries(grouped).map(([key, group]) => {
        const { content_type, object_id } = group[0];
        const id = String(object_id);

        let entity: Task | Milestone | Project | Goal | null = null;
        let type: "task" | "milestone" | "project" | "goal" | null = null;

        if (taskMap[id]) {
          entity = taskMap[id];
          type = "task";
        } else if (milestoneMap[id]) {
          entity = milestoneMap[id];
          type = "milestone";
        } else if (projectMap[id]) {
          entity = projectMap[id];
          type = "project";
        } else if (goalMap[id]) {
          entity = goalMap[id];
          type = "goal";
        }

        if (!entity || !type) return null;

        const breadcrumb = getEntityBreadcrumb(entity, {
          goalMap,
          projectMap,
          milestoneMap,
        }).trim();

        return group.map((note) => (
          <NoteCard key={note.id} note={note} breadcrumb={breadcrumb} />
        ));
      })}
    </section>
  );
}
