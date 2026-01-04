"use client";

import { Pin as PinIcon } from "lucide-react";
import { usePinDialogStore } from "../../lib/dialogs/usePinDialogStore";
import { getContrastingText } from "@shared/utils/getContrastingText";

type EntityType = "task" | "milestone" | "project" | "goal";
const isEntityType = (v: unknown): v is EntityType =>
  typeof v === "string" && ["task", "milestone", "project", "goal"].includes(v);

type AddPinButtonProps = {
  modeId: number;
  entityId: number;
  entityType: EntityType | "mode";
  modeColor: string;
};

export default function AddPinButton({
  modeId,
  entityId,
  entityType,
  modeColor,
}: AddPinButtonProps) {
  const { open } = usePinDialogStore();

  const handleClick = () => {
    const normalized = isEntityType(entityType)
      ? { entity: entityType as EntityType, entityId }
      : { entity: "mode" as const, entityId: modeId };
    open({ modeId, entity: entityType, entityId, modeColor });
  };

  const textColor = getContrastingText(modeColor);

  return (
    <button
      onClick={handleClick}
      className="p-4 rounded-full shadow-lg flex items-center justify-center transition border"
      style={{
        backgroundColor: modeColor,
        color: textColor,
        borderColor: modeColor,
      }}
      aria-label="Add Pin"
    >
      <PinIcon className="w-5 h-5" />
    </button>
  );
}
