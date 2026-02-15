"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Plus, TargetIcon, FolderIcon } from "lucide-react";
import { getContrastingText } from "@shared/utils/getContrastingText";

/* ── Composite icon: milestone (top), project (bottom-left), goal (bottom-right) ── */
function EntityCreatorIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      {/* Milestone — downward-pointing triangle, top center */}
      <polygon points="7.5,1 16.5,1 12,9" fill={color} />
      {/* Project — folder silhouette, bottom left */}
      <path d="M2,14 L2,20 L10,20 L10,15 L7,15 L6,14 Z" fill={color} />
      {/* Goal — concentric target circles, bottom right */}
      <circle cx="19" cy="17" r="4.5" stroke={color} strokeWidth="1.5" />
      <circle cx="19" cy="17" r="2" stroke={color} strokeWidth="1" />
      <circle cx="19" cy="17" r="0.5" fill={color} />
    </svg>
  );
}

/* ── Types ── */
type Props = {
  modeColor: string;
  onAddTask: () => void;
  onAddGoal: () => void;
  onAddProject: () => void;
  onAddMilestone: () => void;
};

/* ── Drag threshold (px) to distinguish tap from drag ── */
const DRAG_THRESHOLD = 8;

export default function MobileEntityFAB({
  modeColor,
  onAddTask,
  onAddGoal,
  onAddProject,
  onAddMilestone,
}: Props) {
  const textColor = getContrastingText(modeColor);
  const [expanded, setExpanded] = useState(false);

  /* Position: stored as bottom/right CSS offsets */
  const [pos, setPos] = useState({ bottom: 24, right: 24 });
  const containerRef = useRef<HTMLDivElement>(null);

  /* Drag refs (avoid re-renders during drag) */
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startBottom: 0,
    startRight: 0,
    moved: false,
  });

  /* Prevent click after drag */
  const lastDragEnd = useRef(0);
  const wasDrag = () => Date.now() - lastDragEnd.current < 250;

  /* ── Touch handlers ── */
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const t = e.touches[0];
      dragRef.current = {
        active: true,
        startX: t.clientX,
        startY: t.clientY,
        startBottom: pos.bottom,
        startRight: pos.right,
        moved: false,
      };
    },
    [pos]
  );

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const d = dragRef.current;
    if (!d.active) return;
    const t = e.touches[0];
    const dx = t.clientX - d.startX;
    const dy = t.clientY - d.startY;

    if (
      !d.moved &&
      Math.abs(dx) < DRAG_THRESHOLD &&
      Math.abs(dy) < DRAG_THRESHOLD
    )
      return;
    d.moved = true;

    /* Clamp to viewport */
    const maxRight = window.innerWidth - 80;
    const maxBottom = window.innerHeight - 80;
    setPos({
      right: Math.max(8, Math.min(maxRight, d.startRight - dx)),
      bottom: Math.max(8, Math.min(maxBottom, d.startBottom - dy)),
    });
  }, []);

  const onTouchEnd = useCallback(() => {
    if (dragRef.current.moved) {
      lastDragEnd.current = Date.now();
    }
    dragRef.current.active = false;
  }, []);

  /* ── Click outside to collapse ── */
  useEffect(() => {
    if (!expanded) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setExpanded(false);
      }
    };
    /* Small delay so the opening touch doesn't immediately close */
    const timer = setTimeout(() => {
      document.addEventListener("touchstart", close, { passive: true });
      document.addEventListener("mousedown", close);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("mousedown", close);
    };
  }, [expanded]);

  /* ── Helpers ── */
  const handleSelect = (action: () => void) => {
    setExpanded(false);
    action();
  };

  const toggleExpanded = () => {
    if (!wasDrag()) setExpanded((p) => !p);
  };

  const handleTaskTap = () => {
    if (!wasDrag()) {
      setExpanded(false);
      onAddTask();
    }
  };

  /* ── Expanded entity buttons (pop out above Entity Creator) ── */
  const entityButtons = [
    {
      label: "Add goal",
      icon: <TargetIcon className="w-6 h-6" />,
      action: onAddGoal,
    },
    {
      label: "Add project",
      icon: (
        <FolderIcon
          className="w-6 h-6"
          style={{ fill: textColor, stroke: "none" }}
        />
      ),
      action: onAddProject,
    },
    {
      label: "Add milestone",
      icon: (
        <span
          className="triangle"
          style={{ borderTopColor: textColor, transform: "scale(1.5)" }}
        />
      ),
      action: onAddMilestone,
    },
  ];

  return (
    <div
      ref={containerRef}
      className="fixed z-50 lg:hidden"
      style={{ bottom: pos.bottom, right: pos.right }}
    >
      {/* Expanded entity buttons — fan out vertically above */}
      <div
        className="flex flex-col items-center gap-3 mb-3 transition-all duration-200 origin-bottom"
        style={{
          opacity: expanded ? 1 : 0,
          transform: expanded ? "scaleY(1)" : "scaleY(0.5)",
          pointerEvents: expanded ? "auto" : "none",
        }}
      >
        {entityButtons.map((btn, i) => (
          <button
            key={btn.label}
            onClick={() => handleSelect(btn.action)}
            className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200"
            style={{
              backgroundColor: modeColor,
              color: textColor,
              opacity: expanded ? 1 : 0,
              transform: expanded ? "translateY(0)" : "translateY(16px)",
              transitionDelay: expanded ? `${i * 40}ms` : "0ms",
            }}
            aria-label={btn.label}
            type="button"
          >
            {btn.icon}
          </button>
        ))}
      </div>

      {/* Main buttons — stacked vertically, Entity Creator above Task */}
      <div className="flex flex-col items-center gap-3">
        {/* Entity Creator button */}
        <button
          onClick={toggleExpanded}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform duration-200"
          style={{
            backgroundColor: modeColor,
            color: textColor,
            transform: expanded ? "rotate(45deg)" : "rotate(0deg)",
          }}
          aria-label="Create entity"
          type="button"
        >
          <EntityCreatorIcon color={textColor} size={30} />
        </button>

        {/* Add Task button */}
        <button
          onClick={handleTaskTap}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center"
          style={{ backgroundColor: modeColor, color: textColor }}
          aria-label="Add task"
          type="button"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}
