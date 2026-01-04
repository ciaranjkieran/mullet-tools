"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Mode } from "@shared/types/Mode";
import { Goal } from "@shared/types/Goal";
import { Project } from "@shared/types/Project";
import { useCreateProject } from "@shared/api/hooks/projects/useCreateProject";
import BuildProjectForm from "./BuildProjectForm";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  defaultModeId: number | null;
  modes: Mode[];
  goals: Goal[];
  projects: Project[]; // should include ancestors for any selectable project
};

export default function BuildProjectWindow({
  isOpen,
  onClose,
  defaultModeId,
  modes,
  goals,
  projects,
}: Props) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [modeId, setModeId] = useState<number | null>(defaultModeId);
  const [goalId, setGoalId] = useState<number | null | undefined>(null);
  const [parentId, setParentId] = useState<number | null | undefined>(null);

  const { mutate: createProject } = useCreateProject();

  useEffect(() => {
    if (isOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  // seed mode when opening
  useEffect(() => {
    if (isOpen && defaultModeId !== null) setModeId(defaultModeId);
  }, [isOpen, defaultModeId]);

  // tiny ancestry helper (no external lineage fn)
  const projectsById = useMemo(() => {
    const m = new Map<number, Project>();
    projects.forEach((p) => m.set(p.id, p));
    return m;
  }, [projects]);

  const effectiveGoalFromProjectId = useCallback(
    (pid: number | null | undefined): number | null => {
      if (pid == null) return null;
      const seen = new Set<number>();
      let cur = projectsById.get(pid);
      while (cur && !seen.has(cur.id)) {
        seen.add(cur.id);
        if (cur.goalId != null) return cur.goalId;
        const up = cur.parentId ?? null;
        cur = up != null ? projectsById.get(up) : undefined;
      }
      return null;
    },
    [projectsById]
  );

  // whenever the selected project changes, derive the goal for display
  useEffect(() => {
    const eff = effectiveGoalFromProjectId(parentId ?? null);
    // set even if null so UI reflects the truth; XOR is enforced only at submit
    setGoalId(eff);
  }, [parentId, effectiveGoalFromProjectId]);

  // XOR only at submit time
  function normalizeProjectAncestors(
    parentIdIn: number | null | undefined,
    goalIdIn: number | null | undefined
  ) {
    const parent = parentIdIn ?? null;
    const goal = goalIdIn ?? null;
    if (parent !== null) return { parentId: parent, goalId: null };
    if (goal !== null) return { parentId: null, goalId: goal };
    return { parentId: null, goalId: null };
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title || !modeId) return;

    const { parentId: nParent, goalId: nGoal } = normalizeProjectAncestors(
      parentId,
      goalId
    );

    createProject(
      {
        title: title.trim(),
        modeId,
        dueDate: dueDate || undefined,
        dueTime: dueTime || undefined,
        parentId: nParent,
        goalId: nGoal,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl z-50 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <BuildProjectForm
            title={title}
            dueDate={dueDate}
            dueTime={dueTime}
            modeId={modeId}
            goalId={goalId}
            parentId={parentId}
            setTitle={setTitle}
            setDueDate={setDueDate}
            setDueTime={setDueTime}
            setModeId={setModeId}
            setGoalId={setGoalId}
            setParentId={setParentId}
            handleSubmit={handleSubmit}
            modes={modes}
            goals={goals}
            projects={projects}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
