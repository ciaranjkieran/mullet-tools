"use client";

import { useEffect, useMemo, useState } from "react";
import { Note } from "@shared/types/Note";
import { format } from "date-fns";
import parse from "html-react-parser";
import clsx from "clsx";
import { usePatchNote } from "@shared/api/hooks/notes/usePatchNote";
import { useDeleteNote } from "@shared/api/hooks/notes/useDeleteNote";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";

import ConfirmDialog from "../../lib/utils/ConfirmDialog";

import { useModeStore } from "@shared/store/useModeStore";
import { useGoalStore } from "@shared/store/useGoalStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useTaskStore } from "@shared/store/useTaskStore";

type Props = {
  note: Note;
  breadcrumb?: string;
  modeLevel: boolean;
};

export default function NoteCard({ note, breadcrumb, modeLevel }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const patchNote = usePatchNote();
  const deleteNote = useDeleteNote();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: "Update your reflection..." }),
    ],
    content: body,
    editable: false,
    onUpdate: ({ editor }) => setBody(editor.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(isEditing);
    if (isEditing) editor.commands.focus();
  }, [isEditing, editor]);

  const date = format(new Date(note.created_at), "PPPp");

  const handleSave = () => {
    if (!editor || !body.trim()) return;
    patchNote.mutate({ id: note.id, body });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    editor?.commands.setContent(note.body);
    setBody(note.body);
  };

  const previewText = useMemo(() => {
    const tmp = document.createElement("div");
    tmp.innerHTML = body || note.body || "";
    const text = tmp.textContent || tmp.innerText || "";
    return text.trim().slice(0, 120) + (text.length > 120 ? "…" : "");
  }, [body, note.body]);

  const handleDeleteRequest = () => setConfirmOpen(true);
  const handleConfirmDelete = () => deleteNote.mutate(note.id);

  const modes = useModeStore?.((s) => s.modes) ?? [];
  const goals = useGoalStore?.((s) => s.goals) ?? [];
  const projects = useProjectStore?.((s) => s.projects) ?? [];
  const milestones = useMilestoneStore?.((s) => s.milestones) ?? [];
  const tasks = useTaskStore?.((s) => s.tasks) ?? [];

  const normalizeType = (t?: string) => {
    if (!t) return "";
    const s = t.toLowerCase().trim();
    const afterPipe = s.split("|").map((x) => x.trim());
    const last = afterPipe[afterPipe.length - 1];
    const dot = last.split(".").pop() || last;
    return dot;
  };

  const ct = useMemo(
    () => normalizeType(note.content_type),
    [note.content_type]
  );

  const liveTitle = useMemo(() => {
    const id = note.object_id;
    switch (ct) {
      case "mode": {
        const x = modes.find((m) => m.id === id);
        return x?.title ?? x?.title ?? null;
      }
      case "goal": {
        const x = goals.find((g) => g.id === id);
        return x?.title ?? x?.title ?? null;
      }
      case "project": {
        const x = projects.find((p) => p.id === id);
        return x?.title ?? x?.title ?? null;
      }
      case "milestone": {
        const x = milestones.find((m) => m.id === id);
        return x?.title ?? x?.title ?? null;
      }
      case "task": {
        const x = tasks.find((t) => t.id === id);
        return x?.title ?? x?.title ?? null;
      }
      default:
        return null;
    }
  }, [ct, note.object_id, modes, goals, projects, milestones, tasks]);

  const displayTitle =
    liveTitle ?? (note as any).display_title ?? note.entityTitle ?? "";

  return (
    <div className="rounded border bg-gray-50 p-4 shadow-sm text-sm text-gray-800 space-y-4">
      <div className={clsx("leading-relaxed space-y-2")}>
        {editor && isEditing ? (
          <EditorContent
            editor={editor}
            className="bg-white border p-2 rounded outline-none min-h-[80px]"
          />
        ) : (
          parse(note.body)
        )}
      </div>

      <div className="border-t pt-2 text-xs text-gray-500">
        <p className="mb-1">{date}</p>

        {modeLevel && (
          <>
            <p className="italic text-gray-600">
              Reflecting on:{" "}
              <span className="font-medium text-black">
                {displayTitle || "—"}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{breadcrumb}</p>
          </>
        )}
      </div>

      <div className="flex justify-end gap-3">
        {!isEditing ? (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-blue-600 hover:underline"
            >
              Edit
            </button>
            <button
              onClick={handleDeleteRequest}
              className="text-xs text-red-500 hover:underline disabled:opacity-60"
              disabled={deleteNote.isPending}
            >
              Delete
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleSave}
              className="text-xs text-green-600 hover:underline"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="text-xs text-gray-500 hover:underline"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete this note?"
        description={
          <div className="space-y-3">
            <p>
              This action cannot be undone. The note will be permanently
              deleted.
            </p>
            {previewText && (
              <p className="text-xs text-gray-700 bg-white border rounded p-2">
                <span className="font-medium">Preview:</span> {previewText}
              </p>
            )}
          </div>
        }
        confirmText={deleteNote.isPending ? "Deleting…" : "Delete"}
        cancelText="Cancel"
      />
    </div>
  );
}
