"use client";

import { FC } from "react";

type Props = {
  onClick: () => void;
  modeColor: string;
};

const CreateMilestoneTemplateButton: FC<Props> = ({ onClick, modeColor }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 py-4 rounded-md border shadow-sm text-base font-medium hover:bg-gray-50 transition w-full"
    >
      <div
        style={{
          borderBottom: "0",
          borderTop: `20px solid ${modeColor}`,
          borderLeft: "12px solid transparent",
          borderRight: "12px solid transparent",
          width: 0,
          height: 0,
        }}
      />
      Create Milestone Template
    </button>
  );
};

export default CreateMilestoneTemplateButton;
