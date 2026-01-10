"use client";

import { MessageSquare } from "lucide-react";
import { CSSProperties } from "react";

type Props = {
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
};

export default function ModeCommentsButton({
  style,
  className,
  onClick,
}: Props) {
  return (
    <div className="relative inline-flex items-center group">
      <span
        className="
          pointer-events-none absolute 
          right-[80%]
          top-full mt-2
          whitespace-nowrap 
          rounded-md bg-gray-900 px-2 py-1 text-xs 
          font-medium text-white shadow-lg 
          opacity-0 transition-opacity
          group-hover:opacity-100
        "
      >
        Comments
      </span>

      <button
        type="button"
        onClick={onClick}
        className={className}
        style={style}
        aria-label="Open Comments View"
      >
        <MessageSquare className="w-6 h-6 text-black" />
      </button>
    </div>
  );
}
