"use client";

import { FileStack } from "lucide-react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

type Props = {
  className?: string;
  style?: React.CSSProperties;
};

export default function ModeTemplatesButton({ className, style }: Props) {
  const router = useRouter();

  return (
    <div className="relative inline-flex items-center group">
      <span
        className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 
                   whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs 
                   font-medium text-white shadow-lg opacity-0 transition-opacity
                   group-hover:opacity-100"
      >
        Templates
      </span>

      <button
        type="button"
        onClick={() => router.replace("/dashboard/templates")}
        className={clsx(className)}
        style={style}
        aria-label="Switch to Templates View"
      >
        <FileStack className="w-6 h-6 text-black" />
      </button>
    </div>
  );
}
