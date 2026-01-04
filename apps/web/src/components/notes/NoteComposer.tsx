"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { getContrastingText } from "@shared/utils/getContrastingText";
import { usePostNote } from "@shared/api/hooks/notes/usePostNote";
import { useNoteStore } from "@shared/store/useNoteStore";
import clsx from "clsx";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";

type Handle = { focus: () => void };

type Props = {
  modeId: number;
  modeColor: string;
  entity: "task" | "milestone" | "project" | "goal" | "mode";
  entityId: number;
  entityTitle: string;
  autoFocus?: boolean;
};

export default forwardRef<Handle, Props>(function NoteComposer(
  {
    modeId,
    modeColor,
    entity,
    entityId,
    entityTitle,
    autoFocus = false,
  }: Props,
  ref
) {
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isH1, setIsH1] = useState(false);

  const postNote = usePostNote();
  const addNote = useNoteStore((s) => s.addNote);
  const textColor = getContrastingText(modeColor);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: "Reflect on something..." }),
    ],
    content: "",
    autofocus: autoFocus ? "end" : false,
  });

  useImperativeHandle(
    ref,
    () => ({
      focus: () => editor?.commands.focus("end"),
    }),
    [editor]
  );

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      setIsBold(editor.isActive("bold"));
      setIsItalic(editor.isActive("italic"));
      setIsUnderline(editor.isActive("underline"));
      setIsH1(editor.isActive("heading", { level: 1 }));
    };
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  useEffect(() => {
    if (autoFocus && editor) setTimeout(() => editor.commands.focus("end"), 0);
  }, [autoFocus, editor]);

  const handleSubmit = async () => {
    if (!editor || editor.isEmpty) return;
    const body = editor.getHTML().trim();
    if (!body) return;
    const newNote = await postNote.mutateAsync({
      body,
      mode_id: modeId,
      content_type: entity,
      object_id: entityId,
      entity_title: entityTitle,
    });
    addNote(newNote);
    editor.commands.clearContent();
    if (autoFocus) editor.commands.focus("end");
  };

  return (
    <div className="w-full border rounded shadow-sm bg-white">
      <div
        className="h-2 w-full rounded-t"
        style={{ backgroundColor: modeColor }}
      />
      <div className="p-2">
        {editor && (
          <div className="flex gap-2 mb-2 border-b pb-1">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={clsx(
                "text-sm font-bold px-2 py-1 border rounded",
                isBold && "bg-gray-200"
              )}
            >
              B
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={clsx(
                "text-sm italic px-2 py-1 border rounded",
                isItalic && "bg-gray-200"
              )}
            >
              I
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={clsx(
                "text-sm underline px-2 py-1 border rounded",
                isUnderline && "bg-gray-200"
              )}
            >
              U
            </button>
            <button
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className={clsx(
                "text-sm px-2 py-1 border rounded",
                isH1 && "bg-gray-200"
              )}
            >
              H1
            </button>
          </div>
        )}

        <EditorContent editor={editor} className="editor-box" tabIndex={0} />

        <div className="flex justify-end mt-2">
          <button
            onClick={handleSubmit}
            className="text-sm px-3 py-1 text-white rounded hover:brightness-90"
            style={{ backgroundColor: modeColor, color: textColor }}
          >
            Add Note
          </button>
        </div>
      </div>
    </div>
  );
});
