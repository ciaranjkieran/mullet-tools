"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Mode } from "@shared/types/Mode";
import { usePinsByMode } from "@shared/api/hooks/boards/usePinsByMode";
import ModeBoardsView from "./ModeBoardsView";
// ⬅️ remove: import EditPinDialog from "./windows/EditPinDialog";

type Props = { mode: Mode };

export default function AllModeBoardSection({ mode }: Props) {
  const { data: pins = [], isLoading } = usePinsByMode(mode.id);
  const [showBoard, setShowBoard] = useState(true);
  if (!isLoading && pins.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-5 rounded-sm"
          style={{ backgroundColor: mode.color }}
        />
        <h2 className="text-lg font-semibold text-gray-800">{mode.title}</h2>
      </div>

      {/* ⬅️ remove the per-section <EditPinDialog /> here */}

      {isLoading && <p className="text-sm text-gray-500">Loading...</p>}

      {pins.length > 0 && (
        <div className="space-y-2">
          <button
            className="flex items-center gap-2 text-md text-black-700 font-semibold hover:underline"
            onClick={() => setShowBoard((prev) => !prev)}
          >
            {showBoard ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            {mode.title} Board
          </button>

          {showBoard && <ModeBoardsView mode={mode} isAllMode={true} />}
        </div>
      )}
    </div>
  );
}
