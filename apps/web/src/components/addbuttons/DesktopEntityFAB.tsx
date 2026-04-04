"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Target, FolderOpen } from "lucide-react";
import { getContrastingText } from "@shared/utils/getContrastingText";

function EntityCreatorIcon({
  color,
  size = 24,
}: {
  color: string;
  size?: number;
}) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <polygon points="7.5,1 16.5,1 12,9" fill={color} />
      <path d="M2,14 L2,20 L10,20 L10,15 L7,15 L6,14 Z" fill={color} />
      <circle cx="19" cy="17" r="4.5" stroke={color} strokeWidth="1.5" />
      <circle cx="19" cy="17" r="2" stroke={color} strokeWidth="1" />
      <circle cx="19" cy="17" r="0.5" fill={color} />
    </svg>
  );
}

function MilestoneIcon({ color }: { color: string }) {
  return (
    <span
      className="triangle"
      style={{ borderTopColor: color, display: "inline-block" }}
    />
  );
}

type Props = {
  modeColor: string;
  onAddGoal: () => void;
  onAddProject: () => void;
  onAddMilestone: () => void;
  onAddTask: () => void;
};

const ITEMS = [
  { key: "goal", label: "Goal" },
  { key: "project", label: "Project" },
  { key: "milestone", label: "Milestone" },
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
  };

  function renderIcon(key: string) {
    switch (key) {
      case "goal":
        return <Target className="w-4 h-4" />;
      case "project":
        return <FolderOpen className="w-4 h-4" />;
      case "milestone":
        return <MilestoneIcon color={textColor} />;
      default:
        return null;
    }
  }

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
      {/* Expanded items: Goal, Project, Milestone */}
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
            transitionDelay: expanded
              ? `${(ITEMS.length - 1 - i) * 40}ms`
              : "0ms",
          }}
          type="button"
        >
          {renderIcon(item.key)}
          {item.label}
        </button>
      ))}

      {/* Entity creator FAB (expands Goal/Project/Milestone) */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform duration-200 hover:scale-105"
        style={{
          backgroundColor: modeColor,
          color: textColor,
        }}
        aria-label="Create goal, project, or milestone"
        type="button"
      >
        <EntityCreatorIcon color={textColor} size={30} />
      </button>

      {/* Always-visible Add Task button */}
      <button
        onClick={() => {
          setExpanded(false);
          onAddTask();
        }}
        className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform duration-200"
        style={{
          backgroundColor: modeColor,
          color: textColor,
        }}
        aria-label="Add task"
        type="button"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
