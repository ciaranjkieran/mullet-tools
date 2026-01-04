"use client";

import { Expand } from "lucide-react";
import { useViewerStore } from "./store/useViewerStore";
import { getContrastingText } from "@shared/utils/getContrastingText";

type EntityType = "task" | "milestone" | "project" | "goal";

interface OpenViewerButtonProps {
  viewerContext:
    | { type: "mode"; modeId: number }
    | { type: "entity"; entity: EntityType; entityId: number };
  modeColor: string;
}

export default function OpenViewerButton({
  viewerContext,
  modeColor,
}: OpenViewerButtonProps) {
  const { openViewer } = useViewerStore();

  const bgColor = modeColor;
  const textColor = getContrastingText(bgColor);

  return (
    <button
      onClick={() => openViewer(viewerContext)}
      className="p-4 rounded-full shadow-lg flex items-center justify-center transition border"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        borderColor: bgColor,
      }}
      aria-label="Open Viewer"
    >
      <Expand className="w-5 h-5" />
    </button>
  );
}
