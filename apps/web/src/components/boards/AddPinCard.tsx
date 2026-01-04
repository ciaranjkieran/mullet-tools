"use client";

import { Pin as PinIcon } from "lucide-react";
import { usePinDialogStore } from "../../lib/dialogs/usePinDialogStore";

type EntityType = "task" | "milestone" | "project" | "goal";
const isEntityType = (v: unknown): v is EntityType =>
  typeof v === "string" && ["task", "milestone", "project", "goal"].includes(v);

type Props = {
  modeId: number;
  entityId: number;
  entityType: EntityType | "mode";
  modeColor: string; // ✅ needed so we can pass it to the store
};

export default function AddPinCard({
  modeId,
  entityId,
  entityType,
  modeColor,
}: Props) {
  const { open } = usePinDialogStore();

  const handleClick = () => {
    const normalized = isEntityType(entityType)
      ? { entity: entityType as EntityType, entityId }
      : { entity: "mode" as const, entityId: modeId };

    // ✅ pass normalized entity + modeColor
    open({ modeId, ...normalized, modeColor });
  };

  return (
    <button
      onClick={handleClick}
      className="flex flex-col items-center justify-center border-2 border-dashed rounded p-4 text-gray-500 hover:border-gray-400 transition h-48 w-full"
      aria-label="Add Pin"
    >
      <PinIcon className="w-6 h-6 mb-1" />
      Add Pin
    </button>
  );
}
