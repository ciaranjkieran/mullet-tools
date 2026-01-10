// containers/common/GoalTreeStateProvider.tsx
"use client";

import { useState, ReactNode } from "react";
import { Goal } from "@shared/types/Goal";

type Props = {
  children: (state: {
    collapsedMap: Record<number, boolean>;
    composerOpenMap: Record<number, boolean>;
    toggleCollapse: (id: number) => void;
    openComposer: (id: number) => void;
    closeComposer: (id: number) => void;
  }) => ReactNode;
};

export default function GoalTreeStateProvider({ children }: Props) {
  const [collapsedMap, setCollapsedMap] = useState<Record<number, boolean>>({});
  const [composerOpenMap, setComposerOpenMap] = useState<
    Record<number, boolean>
  >({});

  const toggleCollapse = (id: number) => {
    setCollapsedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openComposer = (id: number) => {
    setComposerOpenMap((prev) => ({ ...prev, [id]: true }));
  };

  const closeComposer = (id: number) => {
    setComposerOpenMap((prev) => ({ ...prev, [id]: false }));
  };

  return children({
    collapsedMap,
    composerOpenMap,
    toggleCollapse,
    openComposer,
    closeComposer,
  });
}
