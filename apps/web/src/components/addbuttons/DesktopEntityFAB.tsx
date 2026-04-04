"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Target, FolderOpen, Flag, CheckSquare } from "lucide-react";
import { getContrastingText } from "@shared/utils/getContrastingText";

type Props = {
  modeColor: string;
  onAddGoal: () => void;
  onAddProject: () => void;
  onAddMilestone: () => void;
  onAddTask: () => void;
};

const ITEMS = [
  { key: "goal", label: "Goal", Icon: Target },
  { key: "project", label: "Project", Icon: FolderOpen },
  { key: "milestone", label: "Milestone", Icon: Flag },
  { key: "task", label: "Task", Icon: CheckSquare },
] as const;

export default function DesktopEntityFAB({
  modeColor,
  onAddGoal,
  onAddProject,
  onAddMilestone,
  onAddTask,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textColor = getContrastingText(modeColor);

  const actions: Record<string, () => void> = {
    goal: onAddGoal,
    project: onAddProject,
    milestone: onAddMilestone,
    task: onAddTask,
  };

  useEffect(() => {
    if (!expanded) return;
    function close(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [expanded]);

  return (
    <div
      ref={containerRef}
      className="fixed z-[70] bottom-10 right-12 hidden lg:flex flex-col items-center gap-3"
    >
      {/* Expanded items */}
      {ITEMS.map((item, i) => (
        <button
          key={item.key}
          onClick={() => {
            setExpanded(false);
            actions[item.key]();
          }}
          className="flex items-center gap-2 rounded-full pl-4 pr-5 py-2.5 shadow-lg font-medium text-sm transition-all duration-200"
          style={{
            backgroundColor: modeColor,
            color: textColor,
            opacity: expanded ? 1 : 0,
            transform: expanded ? "translateY(0)" : "translateY(16px)",
            pointerEvents: expanded ? "auto" : "none",
            transitionDelay: expanded ? `${(ITEMS.length - 1 - i) * 40}ms` : "0ms",
          }}
          type="button"
        >
          <item.Icon className="w-4 h-4" />
          {item.label}
        </button>
      ))}

      {/* Main FAB */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform duration-200 hover:scale-105"
        style={{
          backgroundColor: modeColor,
          color: textColor,
        }}
        aria-label="Create new"
        type="button"
      >
        <Plus
          className="w-7 h-7 transition-transform duration-200"
          style={{ transform: expanded ? "rotate(45deg)" : "rotate(0deg)" }}
        />
      </button>
    </div>
  );
}
