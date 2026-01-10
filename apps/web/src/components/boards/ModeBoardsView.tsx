"use client";

import { useState, useMemo, useEffect } from "react";
import clsx from "clsx";
import { Mode } from "@shared/types/Mode";
import { Pin } from "@shared/types/Pin";
import { usePinsByMode } from "@shared/api/hooks/boards/usePinsByMode";
import { useViewerStore } from "./viewer/store/useViewerStore";
import { useEditPinDialogStore } from "@/lib/dialogs/useEditPinDialogStore";
import PinCard from "./PinCard";
import AddPinCard from "./AddPinCard";
import AddPinButton from "./AddPinButton";
import OpenViewerButton from "./viewer/OpenViewerButton";
import PinViewerModal from "./viewer/ViewerModal";
import BuildPinWindow from "./windows/BuildPinWindow";
import EditPinDialog from "./windows/EditPinDialog";
import { ChevronDown, ChevronRight } from "lucide-react";

type EntityType = "mode" | "task" | "milestone" | "project" | "goal";

const rawToEntityType = (v: unknown): EntityType | null => {
  // 👉 Numeric content_type (Django ContentType PK etc.)
  if (typeof v === "number") {
    // 🔧 Adjust these mappings to your actual ContentType IDs
    const numericMap: Record<number, EntityType> = {
      1: "mode", // Mode
      2: "task", // Task
      11: "project", // Project
      // add more as needed: [id]: "goal" | "milestone" | ...
    };

    return numericMap[v] ?? null;
  }

  if (typeof v !== "string") return null;

  const lower = v.toLowerCase();

  // Handles string-based content types:
  // "task", "tasks", "tasks.task", "boards_task", "boards.task", etc.
  if (lower.includes("task")) return "task";
  if (lower.includes("milestone")) return "milestone";
  if (lower.includes("project")) return "project";
  if (lower.includes("goal")) return "goal";
  if (lower.includes("mode")) return "mode";

  return null;
};

type Props = {
  mode: Mode;
  isAllMode?: boolean;
  modes?: Mode[];
};

export default function ModeBoardsView({ mode, isAllMode, modes }: Props) {
  const { data: pins = [], isLoading } = usePinsByMode(mode.id);
  const { isOpen, openViewer } = useViewerStore();
  const { open: openEditPin } = useEditPinDialogStore();

  // 🔍 Debug: raw pins
  console.log("[ModeBoardsView] pins for mode", mode.id, pins);

  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{
    type: EntityType;
    id: number;
    title: string;
  } | null>(null);

  const hasPins = pins.length > 0;

  const entityOptions = useMemo(() => {
    type OptionWithMeta = {
      type: EntityType;
      id: number;
      title: string;
      latestCreatedAt: string;
    };

    const map = new Map<string, OptionWithMeta>();

    for (const pin of pins) {
      if (pin.object_id == null) continue;
      const t = rawToEntityType(pin.content_type);
      if (!t) continue;

      const key = `${t}-${pin.object_id}`;
      const existing = map.get(key);

      const createdAt = pin.created_at ?? pin.created_at;
      const createdAtStr =
        typeof createdAt === "string" ? createdAt : String(createdAt);

      if (!existing) {
        map.set(key, {
          type: t,
          id: Number(pin.object_id),
          title: pin.display_title ?? pin.entity_title ?? "(Untitled)",
          latestCreatedAt: createdAtStr,
        });
      } else if (createdAtStr > existing.latestCreatedAt) {
        // keep the latest pin timestamp per entity
        map.set(key, {
          ...existing,
          latestCreatedAt: createdAtStr,
        });
      }
    }

    const all = Array.from(map.values());

    // split mode vs non-mode
    const nonMode = all.filter((o) => o.type !== "mode");
    const modeOptions = all.filter((o) => o.type === "mode");

    // latest-first within each group
    nonMode.sort((a, b) => b.latestCreatedAt.localeCompare(a.latestCreatedAt));
    modeOptions.sort((a, b) =>
      b.latestCreatedAt.localeCompare(a.latestCreatedAt)
    );

    const ordered = [...nonMode, ...modeOptions].map(
      ({ latestCreatedAt: _latestCreatedAt, ...rest }) => rest
    );

    // 🔍 Debug: derived entity options in final order
    console.log("[ModeBoardsView] entityOptions for mode", mode.id, ordered);

    return ordered;
  }, [pins, mode.id]);

  // If the selected entity disappears (due to filter, deletion, etc.), clear it
  useEffect(() => {
    if (!selectedEntity) return;
    const stillExists = entityOptions.some(
      (e) => e.id === selectedEntity.id && e.type === selectedEntity.type
    );
    if (!stillExists) {
      setSelectedEntity(null);
    }
  }, [entityOptions, selectedEntity]);

  // ✅ Filtering logic: always match on (type, object_id)
  const filteredPins = selectedEntity
    ? pins.filter((pin) => {
        const type = rawToEntityType(pin.content_type);
        const id = pin.object_id != null ? Number(pin.object_id) : null;
        return (
          type === selectedEntity.type && id != null && id === selectedEntity.id
        );
      })
    : pins;

  const currentTargetForAdd = selectedEntity
    ? {
        entityType: selectedEntity.type,
        entityId: selectedEntity.id,
      }
    : { entityType: "mode" as const, entityId: mode.id };

  const currentViewerContext = selectedEntity
    ? selectedEntity.type === "mode"
      ? {
          type: "mode" as const,
          modeId: selectedEntity.id,
        }
      : {
          type: "entity" as const,
          entity: selectedEntity.type,
          entityId: selectedEntity.id,
        }
    : { type: "mode" as const, modeId: mode.id };

  return (
    <div className="p-6 relative">
      {pins.length > 2 && (
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setShowFilterOptions((prev) => !prev)}
            className="flex items-center gap-2 text-md text-black font-semibold hover:underline"
          >
            {showFilterOptions ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Filter by Item
          </button>

          {selectedEntity && (
            <button
              onClick={() => setSelectedEntity(null)}
              className="text-sm text-gray-500 hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {showFilterOptions && (
        <div className="mb-6">
          {entityOptions.length === 0 ? (
            <p className="text-sm text-gray-500">
              No linked items found for these pins yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {entityOptions.map((entity) => {
                const isSelected =
                  selectedEntity?.id === entity.id &&
                  selectedEntity?.type === entity.type;
                return (
                  <button
                    key={`${entity.type}-${entity.id}`}
                    onClick={() => setSelectedEntity(entity)}
                    className={clsx(
                      "text-sm px-3 py-1 rounded border transition-colors duration-200 relative overflow-hidden font-normal",
                      isSelected
                        ? "border-blue-500 text-blue-900"
                        : "border-gray-300 text-black"
                    )}
                    style={{
                      backgroundColor: isSelected
                        ? `${mode.color}33`
                        : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = `${mode.color}22`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {entity.title}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isLoading && <p className="text-gray-500">Loading pins...</p>}

      {!filteredPins.length && !isLoading && (
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-500">
            No pins{selectedEntity ? " for this item" : ""}. Add one to get
            started!
          </p>
          <AddPinButton
            modeId={mode.id}
            entityId={currentTargetForAdd.entityId}
            entityType={currentTargetForAdd.entityType}
            modeColor={mode.color}
          />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filteredPins.map((pin: Pin) => (
          <PinCard
            key={pin.id}
            pin={pin}
            onClick={() => openViewer(currentViewerContext, Number(pin.id))}
            onEditClick={() => openEditPin(pin)}
          />
        ))}

        {!hasPins ? (
          <AddPinCard
            modeId={mode.id}
            entityId={currentTargetForAdd.entityId}
            entityType={currentTargetForAdd.entityType}
            modeColor={mode.color}
          />
        ) : pins.length % 4 !== 0 ? (
          // inline with pins when row has space
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg p-4">
            <AddPinButton
              modeId={mode.id}
              entityId={currentTargetForAdd.entityId}
              entityType={currentTargetForAdd.entityType}
              modeColor={mode.color}
            />
            <OpenViewerButton
              viewerContext={currentViewerContext}
              modeColor={mode.color}
            />
          </div>
        ) : (
          // wrap to new row, column 1, still centered inside a square cell
          <>
            <div className="col-span-full h-0" />
            <div className="col-start-1 flex flex-col items-center justify-center gap-4 rounded-lg p-4">
              <AddPinButton
                modeId={mode.id}
                entityId={currentTargetForAdd.entityId}
                entityType={currentTargetForAdd.entityType}
                modeColor={mode.color}
              />
              <OpenViewerButton
                viewerContext={currentViewerContext}
                modeColor={mode.color}
              />
            </div>
          </>
        )}
      </div>

      {isOpen && <PinViewerModal />}
      <BuildPinWindow />
      {!isAllMode && <EditPinDialog modes={modes} modeColor={mode.color} />}
    </div>
  );
}
