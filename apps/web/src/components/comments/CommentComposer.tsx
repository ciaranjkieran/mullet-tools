"use client";

import { useState, useRef, useEffect } from "react";
import { usePostComment } from "@shared/api/hooks/comments/usePostComment";
import { getContrastingText } from "@shared/utils/getContrastingText";
import { X } from "lucide-react";

type Props = {
  modeId: number;
  entity: "task" | "milestone" | "project" | "goal" | "mode";
  entityId: number;
  modeColor: string;
  autoFocus?: boolean;
};

export default function CommentComposer({
  modeId,
  entity,
  entityId,
  modeColor,
  autoFocus = false,
}: Props) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const { mutate, isPending } = usePostComment();
  const textColor = getContrastingText(modeColor);

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const autoSize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 192) + "px";
  };

  useEffect(() => {
    if (autoFocus) setTimeout(() => taRef.current?.focus(), 0);
  }, [autoFocus]);

  useEffect(() => {
    autoSize();
  }, [body]);

  const handlePost = () => {
    if (!body.trim() && files.length === 0) return;
    mutate({ modeId, entity, entityId, body, files });
    setBody("");
    setFiles([]);
    requestAnimationFrame(autoSize);
    if (autoFocus) taRef.current?.focus();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    setFiles((prev) => [...prev, ...Array.from(fileList)]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="mb-6 text-sm">
      <textarea
        ref={taRef}
        className="w-full p-3 border rounded-md text-sm resize-none overflow-auto"
        placeholder="Write a comment..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onInput={autoSize}
        rows={1}
        disabled={isPending}
        style={{ maxHeight: 192 }}
      />

      {files.length > 0 && (
        <div className="mt-2 space-y-1">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-3 py-1 bg-gray-50 border rounded"
            >
              <span className="truncate max-w-[80%]">{file.name}</span>
              <button
                onClick={() => handleRemoveFile(index)}
                className="text-xs text-red-500 hover:underline flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-blue-600 cursor-pointer">
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            disabled={isPending}
            className="hidden"
          />
          <span className="flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16.24 7.76a4 4 0 00-5.66 0l-6.36 6.36a4 4 0 105.66 5.66L18 9.88a2 2 0 00-2.83-2.83l-7.07 7.07"
              />
            </svg>
            Attach files
          </span>
        </label>

        <button
          onClick={handlePost}
          disabled={isPending || (!body.trim() && files.length === 0)}
          className="px-4 py-1 text-sm font-semibold rounded disabled:opacity-50"
          style={{ backgroundColor: modeColor, color: textColor }}
        >
          {isPending ? "Posting..." : "Post Comment"}
        </button>
      </div>
    </div>
  );
}
