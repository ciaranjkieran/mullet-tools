"use client";
import React from "react";
import { Project } from "@shared/types/Project";

type Props = {
  projects: Project[];
  projectId: number | null;
  onChange?: (id: number | null) => void;
  locked?: boolean;
  error?: string;
  isMixed?: boolean;
  modeColor?: string;
  label?: string;
};

export default function EditorProjectSelect({
  projects,
  projectId,
  onChange,
  locked,
  error,
  isMixed,
  modeColor = "#333",
  label = "Project",
}: Props) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-4.5 h-4.5"
          fill={modeColor}
        >
          <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h5.379a1.5 1.5 0 0 1 1.06.44l1.621 1.62H19.5A1.5 1.5 0 0 1 21 6.56V18a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18V4.5Z" />
        </svg>
        {label}
      </label>
      <select
        disabled={locked}
        value={projectId ?? ""}
        onChange={(e) =>
          onChange?.(e.target.value ? Number(e.target.value) : null)
        }
        className={`w-full border rounded-md px-2 py-1.5 text-sm ${
          locked ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        {isMixed && <option value="">— Mixed —</option>}
        <option value="">None</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
