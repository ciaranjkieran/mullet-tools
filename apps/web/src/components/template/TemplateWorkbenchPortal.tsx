// components/template/TemplateWorkbenchPortal.tsx
"use client";
import { useMemo } from "react";

import { useTemplateWorkbenchStore } from "@shared/store/useTemplateWorkbenchStore";
import BuildMilestoneTemplateWindow from "@/components/template/milestone/BuildMilestoneTemplateWindow";
import BuildProjectTemplateWindow from "@/components/template/projects/BuildProjectTemplateWindow";
import { Mode } from "@shared/types/Mode";

type Props = { modes: Mode[]; modeColorFor: (modeId: number) => string };

export default function TemplateWorkbenchPortal({
  modes,
  modeColorFor,
}: Props) {
  const { draft, isOpen, close, clear } = useTemplateWorkbenchStore();

  const modeColor = useMemo(
    () => (draft ? modeColorFor(draft.modeId) : "#555"),
    [draft, modeColorFor]
  );

  if (!draft) return null;

  if (draft.type === "milestone") {
    return (
      <BuildMilestoneTemplateWindow
        open={isOpen}
        onOpenChange={(o) => (!o ? close() : undefined)}
        modes={modes}
        modeColor={modeColor}
        // NEW: prefill props
        prefillNode={draft.data}
        prefillModeId={draft.modeId}
        onAfterClose={clear}
      />
    );
  }

  return (
    <BuildProjectTemplateWindow
      open={isOpen}
      onOpenChange={(o) => (!o ? close() : undefined)}
      modes={modes}
      modeColor={modeColor}
      prefillNode={draft.data}
      prefillModeId={draft.modeId}
      onAfterClose={clear}
    />
  );
}
