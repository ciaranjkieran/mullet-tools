"use client";

import { Mode } from "@shared/types/Mode";
import AllModeBoardSection from "./AllModeBoardSection";
import EditPinDialog from "./windows/EditPinDialog";
import { useEditPinDialogStore } from "@/lib/dialogs/useEditPinDialogStore";

export default function AllModeBoardsView({ modes }: { modes: Mode[] }) {
  const { pin } = useEditPinDialogStore();

  // modeId -> color map
  const modeIdToColor = Object.fromEntries(modes.map((m) => [m.id, m.color]));
  const effectiveColor = pin
    ? modeIdToColor[Number(pin.mode)] ?? "#000"
    : "#000";

  return (
    <div className="overflow-y-auto flex-1 space-y-12">
      {modes.map((mode) => (
        <AllModeBoardSection key={mode.id} mode={mode} />
      ))}

      {/* 🔴 Single global dialog for All-mode */}
      <EditPinDialog modes={modes} modeColor={effectiveColor} />
    </div>
  );
}
