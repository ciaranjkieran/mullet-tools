"use client";

import { usePinsByEntity } from "@shared/api/hooks/boards/usePinsByEntity";
import { usePinDialogStore } from "@/lib/dialogs/usePinDialogStore";
import { useEditPinDialogStore } from "@/lib/dialogs/useEditPinDialogStore";
import { useViewerStore } from "@/components/boards/viewer/store/useViewerStore";

import PinCard from "@/components/boards/PinCard";
import AddPinCard from "@/components/boards/AddPinCard";
import AddPinButton from "@/components/boards/AddPinButton";
import OpenViewerButton from "@/components/boards/viewer/OpenViewerButton";
import ViewerModal from "@/components/boards/viewer/ViewerModal";
import BuildPinWindow from "@/components/boards/windows/BuildPinWindow";
import EditPinDialog from "@/components/boards/windows/EditPinDialog";

type Props = {
  entity: "task" | "milestone" | "project" | "goal";
  entityId: number;
  modeId: number;
  modeColor: string;
};

export default function EntityBoardsTab({
  entity,
  entityId,
  modeId,
  modeColor,
}: Props) {
  const { data: pins = [], isLoading } = usePinsByEntity(
    entity,
    String(entityId)
  );
  const { open: openEditPin } = useEditPinDialogStore();
  const { openViewer, isOpen } = useViewerStore();

  const hasPins = pins.length > 0;
  const columnCount = 4;
  const isModuloZero = pins.length % columnCount === 0;

  return (
    <div className="p-6 relative">
      {isLoading && <p className="text-gray-500">Loading pins...</p>}
      {!hasPins && !isLoading && (
        <p className="text-gray-500 mb-2">
          No pins yet. Add one to get started!
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 relative">
        {pins.map((pin) => (
          <PinCard
            key={pin.id}
            pin={pin}
            onClick={() =>
              openViewer({ type: "entity", entity, entityId }, Number(pin.id))
            }
            onEditClick={() => openEditPin(pin)}
          />
        ))}

        {!hasPins ? (
          <AddPinCard
            modeId={modeId}
            entityId={entityId}
            entityType={entity}
            modeColor={modeColor}
          />
        ) : !isModuloZero ? (
          // Inline extra cell for buttons if pins don't perfectly fill grid
          <div className="flex flex-col items-start justify-center gap-4 ml-16">
            <AddPinButton
              modeId={modeId}
              entityId={entityId}
              entityType={entity}
              modeColor={modeColor}
            />
            <OpenViewerButton
              viewerContext={{ type: "entity", entity, entityId }}
              modeColor={modeColor}
            />
          </div>
        ) : null}
      </div>

      {hasPins && isModuloZero && (
        <div className="absolute bottom-6 right-[-72px] flex flex-col gap-4 ml-16">
          <AddPinButton
            modeId={modeId}
            entityId={entityId}
            entityType={entity}
            modeColor={modeColor}
          />
          <OpenViewerButton
            viewerContext={{ type: "entity", entity, entityId }}
            modeColor={modeColor}
          />
        </div>
      )}

      {isOpen && <ViewerModal />}
      <BuildPinWindow />
      <EditPinDialog modeColor={modeColor} />
    </div>
  );
}
