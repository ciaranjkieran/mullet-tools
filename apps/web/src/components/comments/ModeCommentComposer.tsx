"use client";

import { useModeStore } from "@shared/store/useModeStore";
import CommentComposer from "./CommentComposer";

type Props = { autoFocus?: boolean };

export default function ModeCommentComposer({ autoFocus = false }: Props) {
  const selectedMode = useModeStore((s) => s.selectedMode);
  if (selectedMode === "All") return null;

  return (
    <CommentComposer
      key={selectedMode.id}
      modeId={selectedMode.id}
      entity="mode"
      entityId={selectedMode.id}
      modeColor={selectedMode.color}
      autoFocus={autoFocus}
    />
  );
}
