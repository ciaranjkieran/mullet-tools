"use client";

import { NotebookPen } from "lucide-react";
import { useRouter } from "next/navigation";
import { CSSProperties } from "react";

type Props = {
  style?: CSSProperties;
  className?: string;
};

export default function ModeNotesButton({ style, className }: Props) {
  const router = useRouter();

  return (
    <div className="relative inline-flex items-center group">
      <span
        className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 
                   whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs 
                   font-medium text-white shadow-lg opacity-0 transition-opacity
                   group-hover:opacity-100"
      >
        Notes
      </span>

      <button
        type="button"
        onClick={() => router.push("/dashboard/notes")}
        className={className}
        style={style}
        aria-label="Open Notes View"
      >
        <NotebookPen className="w-6 h-6 text-black" />
      </button>
    </div>
  );
}
