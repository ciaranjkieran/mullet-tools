"use client";

import * as Popover from "@radix-ui/react-popover";
import { HexColorPicker } from "react-colorful";
import { useState } from "react";
import "../../styles/globals.css";

type Props = {
  initialColor: string;
  onSelect: (color: string) => void;
  onCancel?: () => void;
};

export default function ColorPickerPopover({
  initialColor,
  onSelect,
  onCancel,
}: Props) {
  const [tempColor, setTempColor] = useState(initialColor);
  const [open, setOpen] = useState(false);

  const handleSelect = () => {
    onSelect(tempColor);
    setOpen(false);
  };

  const handleCancel = () => {
    setTempColor(initialColor);
    setOpen(false);
    onCancel?.();
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="w-9 h-9 rounded border border-gray-300 hover:border-gray-500 cursor-pointer transition-colors"
          style={{ backgroundColor: tempColor }}
          aria-label="Open color picker"
        />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="bg-white p-4 rounded-xl shadow-xl border max-w-xs w-[220px] z-50"
          sideOffset={8}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="custom-color-picker">
            <HexColorPicker color={tempColor} onChange={setTempColor} />
          </div>

          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => {
                handleCancel();
              }}
              className="text-sm text-gray-500 hover:underline font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleSelect();
              }}
              className="text-sm font-semibold px-4 py-1.5 rounded text-white bg-black hover:bg-gray-800 cursor-pointer"
            >
              Select
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
